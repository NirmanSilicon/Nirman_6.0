// Holds the personal and trusted-contact details collected during registration.
class UserProfile {
  const UserProfile({
    required this.name,
    required this.phone,
    required this.email,
    required this.proxyPhone,
  });

  final String name;
  final String phone;
  final String email;
  final String proxyPhone;

  Map<String, String> toJson() => {
        'name': name,
        'phone': phone,
        'email': email,
        'proxyPhone': proxyPhone,
      };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        name: json['name'] as String,
        phone: json['phone'] as String,
        email: json['email'] as String,
        proxyPhone: json['proxyPhone'] as String,
      );
}
