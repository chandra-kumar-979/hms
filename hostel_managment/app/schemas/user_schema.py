from pydantic import BaseModel, ConfigDict

class GoogleAuthRequest(BaseModel):
    token: str


class DevLoginRequest(BaseModel):
    email: str
    role: str
    name: str | None = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    token: str

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str | None = None
    role: str = "TENANT"


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    profile_image: str | None = None
