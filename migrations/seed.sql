-- Seed data for MotoLog (run after applying schema.sql)

-- Seed bike (id 1)
INSERT INTO bike (id, name, year, odometer, avatarColor) VALUES
(1, 'Honda CB650R', '2024', 8450, 'cyan')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, year = EXCLUDED.year, odometer = EXCLUDED.odometer, avatarColor = EXCLUDED.avatarColor;

-- Maintenance entries
INSERT INTO maintenance (id, date, odometer, category, cost, diy, description, notes) VALUES
('m-1', '2026-04-01', 5500, 'Engine Oil', 48.50, 1, 'Oil & filter change with full synthetic', 'Used Motul 7100 10W-40 and K&N oil filter.'),
('m-2', '2026-05-10', 7000, 'Brake Pads', 25.00, 1, 'Rear brake pad replacement', 'Installed EBC Double-H sintered brake pads. Cleaned caliper pistons.'),
('m-3', '2026-06-01', 8100, 'Chain / Sprocket', 12.00, 1, 'Drive chain adjustment, clean & lube', 'Cleaned with IPONE chain cleaner and applied chain paste.')
ON CONFLICT (id) DO NOTHING;

-- Schedules
INSERT INTO schedules (id, category, intervalKm, intervalMonths, lastOdo, lastDate) VALUES
('s-1', 'Engine Oil', 3000, 6, 5500, '2026-04-01'),
('s-2', 'Spark Plugs', 12000, 24, 6800, '2026-05-02'),
('s-3', 'Chain / Sprocket', 1000, 2, 8100, '2026-06-01'),
('s-4', 'Tires', 15000, 36, 5800, '2026-04-10')
ON CONFLICT (id) DO NOTHING;

-- Rides
INSERT INTO rides (id, date, route, distance, duration, fuelLiters, fuelCost, notes) VALUES
('r-1', '2026-04-12', 'Tagaytay Vista Loop', 150.0, '3h 45m', 6.2, 10.20, 'Great scenic ride. Nice weather. Fuel economy was great.'),
('r-2', '2026-05-02', 'Sierra Madre Twisty Run', 210.0, '4h 15m', 8.8, 14.50, 'Heavy twisties. Exhaust upgrade sounds crisp.'),
('r-3', '2026-05-24', 'Infanta Coastal Highway Cruise', 280.0, '5h 50m', 11.2, 18.40, 'Long highway cruise. High speed runs, bike ran flawless.'),
('r-4', '2026-06-05', 'Evening Coffee Run (City)', 60.0, '1h 30m', 2.6, 4.20, 'Brisk night cruise in the city. Little traffic.')
ON CONFLICT (id) DO NOTHING;

-- Upgrades
INSERT INTO upgrades (id, date, partName, category, cost, odometer, status, notes) VALUES
('u-1', '2026-04-20', 'Akrapovič Full Exhaust System', 'Performance', 1250.00, 6200, 'Installed', 'Fitted at dealership. Perfect sound levels.'),
('u-2', '2026-05-15', 'Evotech Radiator Guard', 'Protection', 95.00, 7200, 'Installed', 'Simple DIY job. Fits perfectly. Solid build quality.'),
('u-3', '2026-06-08', 'Quad Lock Handlebar Mount', 'Electronics', 65.00, 8400, 'Installed', 'With vibration dampener. Mounted on left clip-on.'),
('u-4', '2026-06-25', 'Öhlins S46 Rear Shock Absorber', 'Performance', 890.00, 9000, 'Planned', 'Scheduled for install next month before trackday.')
ON CONFLICT (id) DO NOTHING;
