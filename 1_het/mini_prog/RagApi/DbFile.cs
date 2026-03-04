using System.ComponentModel.DataAnnotations.Schema;

namespace ef
{
    [Table("File")]
    public class DbFile
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID {get;set;}
        public int ProjectID {get; set;}
        public string Name {get; set;}
        public string path {get;set;}

    }
}