from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model


class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = username or kwargs.get("email") or kwargs.get("username")
        if not identifier or not password:
            return None
        UserModel = get_user_model()
        try:
            user = UserModel._default_manager.get(email__iexact=identifier)
        except UserModel.DoesNotExist:
            try:
                user = UserModel._default_manager.get(username__iexact=identifier)
            except UserModel.DoesNotExist:
                UserModel().set_password(password)
                return None
            except UserModel.MultipleObjectsReturned:
                return None
        except UserModel.MultipleObjectsReturned:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
