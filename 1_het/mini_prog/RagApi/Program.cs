using System.Text;
using System.Text.Json;
using UglyToad.PdfPig;
using DocumentFormat.OpenXml.Packaging;
var builder = WebApplication.CreateBuilder(args);
//builder.Services.AddHttpClient();

builder.Services.AddHttpClient("default", c =>
{
    c.Timeout = TimeSpan.FromMinutes(5);
});


var app = builder.Build();
app.MapGet("/", () => "RagApi fut ✅");

const string Qdrant = "http://localhost:6333";
const string Collection = "docs";
const string Ollama = "http://localhost:11434";
const string Embed_model = "embeddinggemma:latest";
const string Gen_model = "llama3";

static async Task EnsureCollection(HttpClient http)
{
    var get = await http.GetAsync($"{Qdrant}/collections/{Collection}");
    if (get.IsSuccessStatusCode) return;

    var createPayload = new
    {
        vectors = new
        {
            size = 768,
            distance = "Cosine"
        }
    };

    var create = await http.PutAsJsonAsync($"{Qdrant}/collections/{Collection}", createPayload);
    create.EnsureSuccessStatusCode();
}
static string ExtractTextFromPdf(IFormFile file)
{
    using var ms = new MemoryStream();
    file.CopyTo(ms);
    ms.Position = 0;

    var sb = new StringBuilder();

    using (var pdf = PdfDocument.Open(ms))
    {
        foreach (var page in pdf.GetPages())
        {
            sb.AppendLine(page.Text);
        }
    }

    return sb.ToString();
}
static string ExtractTextFromDocx(IFormFile file)
{
    using var ms = new MemoryStream();
    file.CopyTo(ms);
    ms.Position = 0;

    using var doc = WordprocessingDocument.Open(ms, false);
    var body = doc.MainDocumentPart?.Document?.Body;

    if (body is null) return "";

    // Body.InnerText egyszerű, de működik: összefűzi a szöveget
    return body.InnerText;
}
static List<string> chunkText(string text, int chunkLength, int redundance)
{
    var list = new List<string>();
    int i = 0;
    while (i < text.Length)
    {
        int len = Math.Min(chunkLength, text.Length - i);
        var chunk = text.Substring(i, len);
        list.Add(chunk);
        i += chunkLength - redundance;
        if (chunkLength - redundance <= 0) break;
    }
    return list;
}
static async Task<float[]> Embed(HttpClient http, string text)
{
    
    var payload = new { model = Embed_model, prompt = text };
    var response = await http.PostAsJsonAsync($"{Ollama}/api/embeddings", payload);
    response.EnsureSuccessStatusCode();

    using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    return doc.RootElement.GetProperty("embedding")
       .EnumerateArray()
       .Select(x => x.GetSingle())
       .ToArray();
}

//Check if the collection already exists or not
app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        using var scopeHttp = new HttpClient();
        await EnsureCollection(scopeHttp);
    });


});
app.MapPost("/api/docs", async (HttpClient http, IFormFile document) =>
{
    string text="";

    if (document is null || document.Length == 0)
        return Results.BadRequest("Nincs fájl");

    var docName = Path.GetFileName(document.FileName);
    var ext = Path.GetExtension(docName).ToLowerInvariant();
    //document->string
    if (ext == ".txt")
    {
        using var reader = new StreamReader(document.OpenReadStream(), Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        text = await reader.ReadToEndAsync();
    }
    else if (ext == ".pdf")
    {
        text = ExtractTextFromPdf(document);
    }
    else if (ext == ".docx")
    {
        
    }
    else
    {
        return Results.BadRequest("Csak .pdf vagy .txt támogatott");
    }

    if (string.IsNullOrWhiteSpace(text))
        return Results.BadRequest("Nem sikerült szöveget kinyerni a fájlból (lehet, hogy szkennelt PDF).");

    //Text -> chunks
    var chunk = chunkText(text, 800, 170);

    //Chunks -> vector
    var points = new List<object>();
    for (int i = 0; i < chunk.Count; i++)
    {
        var point = await Embed(http, chunk[i]);
        points.Add(new
        {
            id = Guid.NewGuid().ToString(),
            vector = point,
            payload = new
            {
                docName = document.Name,
                chunkText = i,
                text = chunk[i]
            }
        });
    }
    //chunks -> qdrant
    var upsertPayload = new { points };
    var upsertRes = await http.PutAsJsonAsync($"{Qdrant}/collections/{Collection}/points?wait=true", upsertPayload);
    upsertRes.EnsureSuccessStatusCode();

    return Results.Ok(new { uploaded = docName, chunks = chunk.Count });

}).DisableAntiforgery();

app.MapPost("/api/chat", async (HttpClient http, ChatRequest req) =>
{
    http.Timeout = TimeSpan.FromMinutes(5);
    try{
    //text -> embedding
    var vec = await Embed(http, req.Prompt);

    //search with qdrant (top 5)
    var searchPayload = new
    {
        vector = vec,
        limit = 3,
        with_payload = true

    };
    var searchRes = await http.PostAsJsonAsync($"{Qdrant}/collections/{Collection}/points/search", searchPayload);
    searchRes.EnsureSuccessStatusCode();

    using var searchDoc = JsonDocument.Parse(await searchRes.Content.ReadAsStringAsync());
    var results = searchDoc.RootElement.GetProperty("result").EnumerateArray().ToList();
    
    Console.WriteLine("A találatok száma:"+results.Count);
        if (results.Count == 0)
        {
            return Results.Ok(new{answer="Nem találom a dokumentumokban."});
        }
    //making context
    var contextParts = new List<string>();
    foreach (var r in results)
    {
        var payload = r.GetProperty("payload");
        var text = payload.GetProperty("text").GetString() ?? " ";
        var docName = payload.GetProperty("docName").GetString() ?? "doc";
        var idx = payload.GetProperty("chunkText").GetInt32();
        contextParts.Add($"[Forrás: {docName} #{idx}]\n{text}");
    }
    var context = string.Join("\n\n---\n\n", contextParts);

    //prompt to model
    var finalPrompt = $"""
    Te egy asszisztens vagy, aki KIZÁRÓLAG az alábbi KONTEKSZTUS alapján válaszol.Mindig azon a nyelven válaszolj, amilyen nyelven a kérdés elhangzott. A szavak közé tegyél szóközöket, ha kell, úgy higy értelmesen legyenek elválasztva.Ha a válasz nem található a kontextusban, mondd: "Nem találom a dokumentumokban."

    KONTEKSZTUS:
    {context}

    KÉRDÉS:
    { req.Prompt}
    """;
   
    //Ollama generate
    var genPayload = new { model = Gen_model, prompt = finalPrompt, stream = false };
    var genRes = await http.PostAsJsonAsync($"{Ollama}/api/generate", genPayload);
    genRes.EnsureSuccessStatusCode();
    
    using var genDoc = JsonDocument.Parse(await genRes.Content.ReadAsStringAsync());
    var answer = genDoc.RootElement.GetProperty("response").GetString() ?? " ";
    //return Results.Ok(new{answer="Nem találom a dokumentumokban.1"});
    Console.WriteLine("A válasz: "+answer);
    return Results.Ok(new { answer });
    }catch(Exception e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 500);
    }

});
app.Run();
record ChatRequest(string Prompt);





