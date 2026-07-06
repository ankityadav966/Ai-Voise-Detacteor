class UserModel {
  final String id;
  final String email;
  final String name;
  final String? profilePicture;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    this.profilePicture,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? 'Anonymous',
      profilePicture: json['profilePicture'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'profilePicture': profilePicture,
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? name,
    String? profilePicture,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      profilePicture: profilePicture ?? this.profilePicture,
    );
  }
}
