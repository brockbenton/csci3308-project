-- Spots table (owned by Brock / map feature)
-- created_by will reference users(id) once Alex adds the users table
CREATE TABLE IF NOT EXISTS spots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sport_type VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- comments table (made by akhil so each spots have comments )
CREATE TABLE IF NOT EXISTS comments(
  id SERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);