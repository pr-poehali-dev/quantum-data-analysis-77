CREATE TABLE hall_pins (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    x NUMERIC(6,2) NOT NULL,
    y NUMERIC(6,2) NOT NULL,
    is_rented BOOLEAN DEFAULT FALSE,
    renter_name VARCHAR(200),
    rent_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hall_image (
    id INT PRIMARY KEY DEFAULT 1,
    image_url TEXT
);

INSERT INTO hall_image (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE rental_requests (
    id SERIAL PRIMARY KEY,
    pin_id INT,
    pin_label VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(100),
    email VARCHAR(200),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
