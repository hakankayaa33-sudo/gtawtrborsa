using System.ComponentModel.DataAnnotations;

namespace GoPostalMVC.Models
{
    public class Courier
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string FullName { get; set; }
        
        [Required]
        public string PhoneNumber { get; set; }
        
        public string ProfileImageUrl { get; set; }
    }
}