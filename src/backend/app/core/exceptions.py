class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class InvalidEmailError(AppException):
    def __init__(self):
        super().__init__("Invalid email address", 400)


class UserNotFoundError(AppException):
    def __init__(self):
        super().__init__("User not found", 404)


class UserAlreadyExistsError(AppException):
    def __init__(self, field: str):
        super().__init__(f"User with {field} already exists", 400)


class InvalidCredentialsError(AppException):
    def __init__(self):
        super().__init__("Invalid credentials", 401)


class TokenExpiredError(AppException):
    def __init__(self):
        super().__init__("Token expired", 401)


class InvalidTokenError(AppException):
    def __init__(self):
        super().__init__("Invalid token", 401)


class TokenRevokedError(AppException):
    def __init__(self):
        super().__init__("Token has been revoked", 401)
