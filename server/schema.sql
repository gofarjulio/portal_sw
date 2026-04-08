-- schema.sql

CREATE DATABASE IF NOT EXISTS lean_sw;
USE lean_sw;

-- Authentication & Roles
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Engineer', 'Operator') DEFAULT 'Operator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects (Lines/Areas)
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  takt_time DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processes
CREATE TABLE IF NOT EXISTS processes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT,
  name VARCHAR(255) NOT NULL,
  operator_name VARCHAR(255),
  manpower INT DEFAULT 1,
  sequence_order INT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Work Elements & Observations
CREATE TABLE IF NOT EXISTS work_elements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  process_id INT,
  name VARCHAR(255) NOT NULL,
  element_type ENUM('manual', 'walking', 'machine', 'waiting'),
  waste_class ENUM('VA', 'NVA', 'NNVA') DEFAULT 'VA',
  sequence_order INT,
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE
);

-- Time Samples (Multiple per step)
CREATE TABLE IF NOT EXISTS time_samples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_element_id INT,
  sample_number INT,
  time_value DECIMAL(10,2),
  FOREIGN KEY (work_element_id) REFERENCES work_elements(id) ON DELETE CASCADE
);

-- TSK Layouts (Canvas JSON Saves)
CREATE TABLE IF NOT EXISTS tsk_layouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT,
  canvas_state JSON,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Dummy Data
INSERT INTO projects (name, takt_time) VALUES ('Assembly Line A', 45.00);
