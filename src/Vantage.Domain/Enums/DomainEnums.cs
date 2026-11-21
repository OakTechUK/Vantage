namespace Vantage.Domain.Enums;

public enum Sex
{
    Unknown = 0,
    Male = 1,
    Female = 2,
    Other = 3
}

public enum RiskLevel
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

/// <summary>
/// UK policing distinguishes between a person who is "absent" (whereabouts unknown but
/// no immediate concern) and "missing" (whereabouts unknown and there is concern).
/// </summary>
public enum MissingCategory
{
    Absent = 0,
    Missing = 1
}

public enum EpisodeStatus
{
    Reported = 0,
    Active = 1,
    Located = 2,
    Closed = 3
}

public enum ReviewStatus
{
    NotScheduled = 0,
    OnTrack = 1,
    DueSoon = 2,
    Overdue = 3
}

public enum TaskCategory
{
    Enquiry = 0,
    HouseToHouse = 1,
    Cctv = 2,
    SocialMedia = 3,
    Hospital = 4,
    School = 5,
    Transport = 6,
    Digital = 7,
    Forensic = 8,
    Other = 9
}

public enum TaskPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3
}

public enum CaseTaskStatus
{
    Open = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

public enum PlaceCategory
{
    Home = 0,
    Family = 1,
    Friend = 2,
    Work = 3,
    School = 4,
    Healthcare = 5,
    Social = 6,
    Transport = 7,
    Other = 8
}

public enum SearchPriority
{
    Low = 0,
    Normal = 1,
    High = 2
}

public enum NoteCategory
{
    General = 0,
    Background = 1,
    Family = 2,
    Health = 3,
    Risk = 4,
    Intelligence = 5,
    Exploitation = 6
}

public enum IfindCategory
{
    Health = 0,
    Transport = 1,
    Waterways = 2,
    Associates = 3,
    Digital = 4,
    Cctv = 5,
    Education = 6,
    Retail = 7,
    Exploitation = 8,
    Environment = 9,
    Media = 10,
    Other = 11
}

public enum IfindStatus
{
    NotStarted = 0,
    InProgress = 1,
    Done = 2,
    NotApplicable = 3
}

public enum CawnStatus
{
    Active = 0,
    Expired = 1,
    Revoked = 2
}

public enum OutcomeType
{
    LocatedSafe = 0,
    ReturnedVoluntarily = 1,
    FoundDeceased = 2,
    Arrested = 3,
    NotLocated = 4
}

public enum OfficerRole
{
    Officer = 0,
    Supervisor = 1,
    Administrator = 2
}
