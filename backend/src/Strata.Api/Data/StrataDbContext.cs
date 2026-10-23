using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Strata.Api.Data;

public class StrataDbContext(DbContextOptions<StrataDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<NoteTag> NoteTags => Set<NoteTag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>(e =>
        {
            e.ToTable("users");
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(320).IsRequired();
            e.Property(u => u.DisplayName).HasMaxLength(64).IsRequired();
            e.Property(u => u.PasswordHash).HasMaxLength(256).IsRequired();
        });

        modelBuilder.Entity<Note>(e =>
        {
            e.ToTable("notes");
            e.HasKey(n => n.Id);
            e.Property(n => n.Title).HasMaxLength(200).IsRequired();
            e.Property(n => n.Content).IsRequired();
            e.Property(n => n.ContentFormat).HasMaxLength(32).HasDefaultValue("markdown");
            e.HasIndex(n => new { n.UserId, n.UpdatedAt });
            e.HasOne(n => n.User)
                .WithMany(u => u.Notes)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            // Case-insensitive trigram-ish search support (simple ILIKE works without
            // extra extensions; this index keeps list queries fast).
            e.HasIndex(n => n.Title);
        });

        modelBuilder.Entity<Tag>(e =>
        {
            e.ToTable("tags");
            e.HasKey(t => t.Id);
            e.Property(t => t.Name).HasMaxLength(64).IsRequired();
            e.HasIndex(t => new { t.UserId, t.Name }).IsUnique();
            e.HasOne(t => t.User)
                .WithMany(u => u.Tags)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<NoteTag>(e =>
        {
            e.ToTable("note_tags");
            e.HasKey(nt => new { nt.NoteId, nt.TagId });
            e.HasOne(nt => nt.Note).WithMany(n => n.NoteTags).HasForeignKey(nt => nt.NoteId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(nt => nt.Tag).WithMany(t => t.NoteTags).HasForeignKey(nt => nt.TagId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}

public class AppUser
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public required string PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Note> Notes { get; set; } = [];
    public List<Tag> Tags { get; set; } = [];
}

public class Note
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public required string Title { get; set; }
    public required string Content { get; set; }
    public string ContentFormat { get; set; } = "markdown";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Soft-delete marker; null means the note is active.</summary>
    public DateTime? DeletedAt { get; set; }
    public List<NoteTag> NoteTags { get; set; } = [];
}

public class Tag
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public required string Name { get; set; }
    public List<NoteTag> NoteTags { get; set; } = [];
}

public class NoteTag
{
    public int NoteId { get; set; }
    public Note? Note { get; set; }
    public int TagId { get; set; }
    public Tag? Tag { get; set; }
}
