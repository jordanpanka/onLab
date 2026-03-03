using System.ComponentModel.DataAnnotations.Schema;

namespace ef
{
    [Table("Project")]
    public class DbProject
    {
         [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID { get; set; }
        public string Name { get; set;}
        public string Description {get; set;}
    }
}