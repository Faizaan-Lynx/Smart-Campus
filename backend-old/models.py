from datetime import datetime, date, time
from sqlmodel import SQLModel, Field, Relationship


# --------------------
# --- Token Model ----
# --------------------

class Token(SQLModel):
    access_token: str
    token_type: str

class TokenData(SQLModel):
    username: str | None = None



# --------------------
# --- Many-to-Many ---
# --------------------

class UserSiteLink(SQLModel, table=True):
    user_id: int | None = Field(default=None, foreign_key="user.id", primary_key=True)
    site_id: int | None = Field(default=None, foreign_key="site.id", primary_key=True)



# --------------------
# --- User Model -----
# --------------------

class UserBase(SQLModel):
    username: str = Field(unique=True)
    email: str | None = None
    full_name: str | None = None

class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    password: str
    disabled: bool | None = True
    is_su: bool | None = False
    created_at: datetime | None = datetime.now()
    updated_at: datetime | None = datetime.now()
    sites: list["Site"] = Relationship(back_populates="users", link_model=UserSiteLink)


class UserCreate(SQLModel):
    email: str
    full_name: str
    password: str

class UserPublic(UserBase):
    id: int
    disabled: bool
    is_su: bool
    created_at: datetime
    updated_at: datetime

class UserUpdate(SQLModel):
    username: str |  None = None
    email: str | None = None
    full_name: str | None = None
    password: str | None = None
    disabled: bool | None = False
    is_su: bool | None = False

class UserPublicMe(UserBase):
    id: int

class UserUpdateMe(SQLModel):
    username: str |  None = None
    email: str | None = None
    full_name: str | None = None
    password: str | None = None



# --------------------
# --- Site Model ----
# --------------------

class SiteBase(SQLModel):
    name: str = Field(unique=True)
    location: str | None = None
    contact: str | None = None
    in_camera: str | None = Field(default=None, unique=True)
    out_camera: str | None = Field(default=None, unique=True)
    in_url: str | None = None
    out_url: str | None = None
    protocol: int | None = 3
    sensitivity: int | None = 1
    fps: int | None = 20
    threshold: int | None = 15
    rotation: int | None = None
    reg_pts: str | None = None
    crop_area: str | None = None


class Site(SiteBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = datetime.now()
    updated_at: datetime | None = datetime.now()
    visits: list["Visit"] = Relationship(back_populates="site")
    hosts: list["Guest"] = Relationship(back_populates="site")
    users: list[User] = Relationship(back_populates="sites", link_model=UserSiteLink)

class SiteCreate(SiteBase):
    pass

class SitePublic(SiteBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

class SiteUpdate(SiteBase):
    pass

class SitePublicMe(SiteBase):
    id: int


# --------------------
# --- Guest Model ----
# --------------------

class GuestBase(SQLModel):
    name: str | None = None
    vector: str | None = None
    is_female: bool | None = None
    is_host: bool | None = False

class Guest(GuestBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    site_id: int | None = Field(default=None, foreign_key="site.id")
    created_at: datetime | None = datetime.now()
    updated_at: datetime | None = datetime.now()
    visits: list["Visit"] = Relationship(back_populates="guest")
    site: Site | None = Relationship(back_populates="hosts")

class GuestCreate(GuestBase):
    site_id: int | None = None

class GuestPublicMe(GuestBase):
    id: int
    site_id: int | None = None

class GuestPublic(GuestPublicMe):
    created_at: datetime | None = None
    updated_at: datetime | None = None

class GuestUpdateMe(SQLModel):
    name: str | None = None
    vector: str | None = None
    is_female: bool | None = None

class GuestUpdate(GuestUpdateMe):
    site_id: bool | None = None
    is_host: bool | None = None



# --------------------
# --- Visit Model ----
# --------------------

class VisitBase(SQLModel):
    date_in: date | None = datetime.now().date()
    time_in: time | None = datetime.now().time()
    time_out: time | None = None
    is_group: bool | None = False
    is_female: bool | None = None
    is_new: bool | None = True    
    site_id: int | None = Field(default=None, foreign_key="site.id")
    guest_id: int | None = Field(default=None, foreign_key="guest.id")

class Visit(VisitBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    site: Site | None = Relationship(back_populates="visits")
    guest: Guest | None = Relationship(back_populates="visits")

class VisitCreate(VisitBase):
    pass

class VisitPublic(VisitBase):
    id: int

class VisitUpdate(SQLModel):
    time_out: time | None = None
    is_group: bool | None = None
    is_female: bool | None = None
    is_new: bool | None = None


# --------------------
# --- Relational -----
# --------------------

class UserPublicWith(UserPublic):
    sites: list[SitePublic] = []

class VisitPublicWith(VisitPublic):
    site: SitePublic | None = None
    guest: GuestPublic | None = None

class SitePublicWith(SitePublic):
    visits: list[VisitPublic] = []
    hosts: list[GuestPublic] = []
    users: list[UserPublic] = []

class GuestPublicWith(GuestPublic):
    # site: SitePublic | None = None
    visits: list[VisitPublic] = []

class VisitPublicWithGuest(VisitPublic):
    guest: GuestPublicMe | None = None

class UserPublicMeWith(UserPublicMe):
    sites: list[SitePublicMe] = []

class SitePublicMeWith(SitePublicMe):
    visits: list[VisitPublicWithGuest] = []
    hosts: list[GuestPublicMe] = []

class SitePublicMeWithHosts(SitePublicMe):
    hosts: list[GuestPublicWith] = []


# --------------------
# ----- Special ------
# --------------------

class VisitIn(VisitCreate):
    track_id: int | None = None
    ts: float | None = None
    vector: list[float] | None = None

class VisitOut(SQLModel):
    site_id: int | None = None
    time_out: time | None = None
