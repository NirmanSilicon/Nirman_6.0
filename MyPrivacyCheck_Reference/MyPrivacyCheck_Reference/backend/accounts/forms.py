from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
User = get_user_model()

class RegistrationForm(UserCreationForm):
    full_name = forms.CharField(max_length=150)
    email = forms.EmailField()
    class Meta:
        model = User
        fields = ("username", "email", "full_name", "password1", "password2")
    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"].strip().lower()
        user.first_name = self.cleaned_data["full_name"].strip()
        if commit:
            user.save()
        return user

class EmailLoginForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)
    def clean(self):
        from django.contrib.auth import authenticate
        data = super().clean()
        if data:
            email = data.get("email", "").strip().lower()
            try:
                account = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                account = None
            self.user = authenticate(username=account.get_username(), password=data.get("password")) if account else None
            if self.user is None:
                raise forms.ValidationError("Invalid email or password.")
        return data
