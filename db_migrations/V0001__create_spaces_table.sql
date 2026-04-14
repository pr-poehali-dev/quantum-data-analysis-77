CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    area NUMERIC(10,2),
    price NUMERIC(10,2),
    location VARCHAR(300),
    description TEXT,
    image_url TEXT,
    is_rented BOOLEAN DEFAULT FALSE,
    renter_name VARCHAR(200),
    renter_contact VARCHAR(200),
    rent_start DATE,
    rent_end DATE,
    rent_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO spaces (title, area, price, location, description) VALUES
('Торговый остров №1', 12, 25000, '1-й этаж, центральный вход', 'Отличная проходимость, рядом с эскалатором'),
('Торговый остров №2', 15, 30000, '1-й этаж, у фуд-корта', 'Высокий трафик в обеденное время'),
('Магазин А-101', 45, 80000, '1-й этаж, крыло А', 'Угловое помещение, 2 витрины'),
('Магазин Б-203', 60, 100000, '2-й этаж, крыло Б', 'Просторный зал, подсобное помещение'),
('Павильон №5', 28, 50000, '2-й этаж, центр', 'Панорамное остекление, отдельный вход');
