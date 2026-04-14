# Tables

users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_pic VARCHAR(255) DEFAULT 'default-profile.png'
);

spots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sport_type VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_by INT references users(id), -- now references users(id)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


comments {
    primary key,
    comment,
    user_id (foreign key to login table),

}