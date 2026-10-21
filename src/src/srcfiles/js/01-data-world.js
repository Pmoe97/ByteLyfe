/* =====================================================================
 * 01-data-world.js — countries, name pools, cities.
 *   econ:  salary/price multiplier vs. the US baseline (all money is shown in $)
 *   tax:   flat effective income-tax rate
 *   drink: legal drinking age      drive: driving age
 *   freeHealth: universal healthcare (doctor visits nearly free)
 *   monarchy: has a royal family (reserved for the Royalty expansion)
 * Pure data.
 * ===================================================================== */

const COUNTRIES = {
  us: {
    name: 'United States', flag: '🇺🇸', adj: 'American', econ: 1.0, tax: 0.22, drink: 21, drive: 16,
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Seattle', 'Atlanta', 'Denver', 'Miami', 'Boston', 'Nashville', 'Portland'],
    m: ['James', 'Michael', 'Robert', 'John', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Andrew', 'Joshua', 'Ethan', 'Noah', 'Liam', 'Mason', 'Logan', 'Elijah', 'Caleb', 'Tyler', 'Marcus'],
    f: ['Mary', 'Jennifer', 'Linda', 'Elizabeth', 'Jessica', 'Sarah', 'Ashley', 'Emily', 'Madison', 'Olivia', 'Emma', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Abigail', 'Harper', 'Chloe', 'Grace', 'Lily', 'Hannah', 'Brianna', 'Kayla', 'Zoe'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Walker', 'Young', 'King', 'Brooks'],
  },
  ca: {
    name: 'Canada', flag: '🇨🇦', adj: 'Canadian', econ: 0.85, tax: 0.26, drink: 19, drive: 16, freeHealth: true,
    cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Halifax', 'Winnipeg', 'Quebec City', 'Edmonton'],
    m: ['Liam', 'Noah', 'William', 'Lucas', 'Benjamin', 'Oliver', 'Jacob', 'Logan', 'Nathan', 'Thomas', 'Samuel', 'Félix', 'Owen', 'Ethan', 'Hunter', 'Connor', 'Gabriel', 'Alexandre', 'Dylan', 'Mathis', 'Wyatt', 'Ryan', 'Isaac', 'Carter'],
    f: ['Olivia', 'Emma', 'Charlotte', 'Amelia', 'Ava', 'Chloé', 'Léa', 'Sophie', 'Abigail', 'Hannah', 'Emily', 'Avery', 'Maya', 'Juliette', 'Évelyne', 'Brooklyn', 'Madison', 'Zoey', 'Stella', 'Ella', 'Rosalie', 'Megan', 'Kaitlyn', 'Nora'],
    last: ['Smith', 'Tremblay', 'Martin', 'Roy', 'Wilson', 'MacDonald', 'Gagnon', 'Johnson', 'Taylor', 'Côté', 'Campbell', 'Anderson', 'Leblanc', 'Lee', 'Brown', 'Bouchard', 'Gauthier', 'Morin', 'Thompson', 'Fraser', 'Lavoie', 'White', 'Murphy', 'Wong'],
  },
  uk: {
    name: 'United Kingdom', flag: '🇬🇧', adj: 'British', econ: 0.85, tax: 0.25, drink: 18, drive: 17, freeHealth: true, monarchy: true,
    cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Bristol', 'Glasgow', 'Edinburgh', 'Cardiff', 'Belfast'],
    m: ['Oliver', 'George', 'Harry', 'Jack', 'Charlie', 'Thomas', 'Oscar', 'William', 'James', 'Henry', 'Leo', 'Alfie', 'Joshua', 'Freddie', 'Archie', 'Ethan', 'Isaac', 'Alexander', 'Joseph', 'Edward', 'Samuel', 'Max', 'Daniel', 'Arthur'],
    f: ['Olivia', 'Amelia', 'Isla', 'Ava', 'Emily', 'Isabella', 'Mia', 'Poppy', 'Ella', 'Lily', 'Grace', 'Sophie', 'Evie', 'Freya', 'Charlotte', 'Florence', 'Daisy', 'Alice', 'Ruby', 'Phoebe', 'Matilda', 'Imogen', 'Harriet', 'Eleanor'],
    last: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Johnson', 'Roberts', 'Robinson', 'Thompson', 'Wright', 'Walker', 'White', 'Edwards', 'Hughes', 'Green', 'Hall', 'Wood', 'Harris', 'Clarke', 'Patel'],
  },
  ie: {
    name: 'Ireland', flag: '🇮🇪', adj: 'Irish', econ: 0.9, tax: 0.28, drink: 18, drive: 17, freeHealth: true,
    cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Kilkenny', 'Sligo'],
    m: ['Jack', 'James', 'Noah', 'Conor', 'Seán', 'Daniel', 'Fionn', 'Cillian', 'Darragh', 'Oisín', 'Liam', 'Michael', 'Patrick', 'Cian', 'Rory', 'Tadhg', 'Ronan', 'Eoin', 'Ciarán', 'Niall', 'Aidan', 'Colm', 'Declan', 'Kieran'],
    f: ['Emily', 'Grace', 'Fiadh', 'Sophie', 'Ava', 'Amelia', 'Ella', 'Aoife', 'Saoirse', 'Siobhán', 'Niamh', 'Caoimhe', 'Róisín', 'Clodagh', 'Orla', 'Ciara', 'Sinéad', 'Éabha', 'Méabh', 'Aisling', 'Molly', 'Lucy', 'Erin', 'Kate'],
    last: ['Murphy', 'Kelly', "O'Sullivan", 'Walsh', 'Smith', "O'Brien", 'Byrne', 'Ryan', "O'Connor", "O'Neill", "O'Reilly", 'Doyle', 'McCarthy', 'Gallagher', 'Doherty', 'Kennedy', 'Lynch', 'Murray', 'Quinn', 'Moore', 'McLoughlin', 'Carroll', 'Connolly', 'Daly'],
  },
  au: {
    name: 'Australia', flag: '🇦🇺', adj: 'Australian', econ: 0.9, tax: 0.25, drink: 18, drive: 17, freeHealth: true,
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Hobart', 'Darwin', 'Canberra', 'Gold Coast'],
    m: ['Oliver', 'Noah', 'Jack', 'William', 'Leo', 'Lucas', 'Thomas', 'Henry', 'Charlie', 'James', 'Mason', 'Hudson', 'Ethan', 'Lachlan', 'Cooper', 'Archer', 'Harrison', 'Riley', 'Xavier', 'Hunter', 'Isaac', 'Liam', 'Max', 'Flynn'],
    f: ['Charlotte', 'Olivia', 'Amelia', 'Isla', 'Mia', 'Ava', 'Grace', 'Willow', 'Harper', 'Chloe', 'Matilda', 'Ella', 'Zoe', 'Ruby', 'Sienna', 'Evie', 'Isabella', 'Sophie', 'Lily', 'Georgia', 'Indi', 'Mackenzie', 'Ivy', 'Frankie'],
    last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson', 'Thompson', 'Nguyen', 'Thomas', 'Walker', 'Harris', 'Lee', 'Ryan', 'Robinson', 'Kelly', 'King', 'Mitchell', 'Campbell', 'Murphy', "O'Brien"],
  },
  mx: {
    name: 'Mexico', flag: '🇲🇽', adj: 'Mexican', econ: 0.35, tax: 0.18, drink: 18, drive: 18,
    cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Cancún', 'Mérida', 'Oaxaca', 'León'],
    m: ['Santiago', 'Mateo', 'Sebastián', 'Leonardo', 'Emiliano', 'Diego', 'Miguel', 'José', 'Juan', 'Luis', 'Carlos', 'Jorge', 'Alejandro', 'Daniel', 'Fernando', 'Ricardo', 'Javier', 'Eduardo', 'Andrés', 'Héctor', 'Iker', 'Gael', 'Rodrigo', 'Pablo'],
    f: ['Sofía', 'Valentina', 'Regina', 'Camila', 'María', 'Ximena', 'Valeria', 'Mariana', 'Renata', 'Daniela', 'Fernanda', 'Guadalupe', 'Ana', 'Lucía', 'Andrea', 'Gabriela', 'Isabella', 'Paola', 'Alejandra', 'Natalia', 'Fátima', 'Itzel', 'Carmen', 'Rosa'],
    last: ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Ortiz', 'Castillo'],
  },
  br: {
    name: 'Brazil', flag: '🇧🇷', adj: 'Brazilian', econ: 0.35, tax: 0.2, drink: 18, drive: 18,
    cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Recife', 'Porto Alegre', 'Curitiba'],
    m: ['Miguel', 'Arthur', 'Heitor', 'Bernardo', 'Théo', 'Davi', 'Gabriel', 'Pedro', 'Lucas', 'Matheus', 'Rafael', 'Gustavo', 'Guilherme', 'João', 'Felipe', 'Bruno', 'Thiago', 'Rodrigo', 'Leonardo', 'Caio', 'Vinícius', 'Diego', 'Eduardo', 'Henrique'],
    f: ['Helena', 'Alice', 'Laura', 'Maria', 'Valentina', 'Sophia', 'Isabella', 'Manuela', 'Júlia', 'Luiza', 'Beatriz', 'Ana', 'Camila', 'Larissa', 'Mariana', 'Gabriela', 'Fernanda', 'Letícia', 'Bruna', 'Amanda', 'Carolina', 'Lorena', 'Yasmin', 'Rafaela'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Moreira'],
  },
  fr: {
    name: 'France', flag: '🇫🇷', adj: 'French', econ: 0.8, tax: 0.3, drink: 18, drive: 18, freeHealth: true,
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Lille', 'Strasbourg', 'Montpellier'],
    m: ['Gabriel', 'Léo', 'Raphaël', 'Louis', 'Arthur', 'Jules', 'Adam', 'Hugo', 'Lucas', 'Nathan', 'Paul', 'Thomas', 'Antoine', 'Maxime', 'Julien', 'Nicolas', 'Pierre', 'Mathis', 'Théo', 'Baptiste', 'Clément', 'Victor', 'Étienne', 'Rémi'],
    f: ['Jade', 'Louise', 'Emma', 'Alice', 'Ambre', 'Lina', 'Rose', 'Chloé', 'Léa', 'Manon', 'Camille', 'Inès', 'Juliette', 'Zoé', 'Léna', 'Sarah', 'Margaux', 'Clara', 'Anaïs', 'Mathilde', 'Élise', 'Pauline', 'Océane', 'Céline'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier'],
  },
  de: {
    name: 'Germany', flag: '🇩🇪', adj: 'German', econ: 0.85, tax: 0.32, drink: 18, drive: 18, freeHealth: true,
    cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Bremen'],
    m: ['Noah', 'Leon', 'Paul', 'Ben', 'Finn', 'Elias', 'Felix', 'Jonas', 'Luca', 'Maximilian', 'Lukas', 'Jan', 'Tim', 'Niklas', 'Moritz', 'Tobias', 'Sebastian', 'Florian', 'Stefan', 'Matthias', 'Henrik', 'Emil', 'Anton', 'Karl'],
    f: ['Emilia', 'Mia', 'Hannah', 'Emma', 'Sophia', 'Lina', 'Mila', 'Lea', 'Clara', 'Marie', 'Anna', 'Lena', 'Laura', 'Julia', 'Katharina', 'Johanna', 'Leonie', 'Charlotte', 'Greta', 'Frieda', 'Ida', 'Paula', 'Nele', 'Sabine'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann'],
  },
  it: {
    name: 'Italy', flag: '🇮🇹', adj: 'Italian', econ: 0.7, tax: 0.3, drink: 18, drive: 18, freeHealth: true,
    cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Florence', 'Bologna', 'Venice', 'Genoa', 'Bari'],
    m: ['Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Mattia', 'Tommaso', 'Gabriele', 'Andrea', 'Riccardo', 'Edoardo', 'Matteo', 'Giuseppe', 'Marco', 'Luca', 'Giovanni', 'Antonio', 'Davide', 'Federico', 'Simone', 'Stefano', 'Pietro', 'Salvatore', 'Vincenzo', 'Enzo'],
    f: ['Sofia', 'Aurora', 'Giulia', 'Ginevra', 'Alice', 'Beatrice', 'Emma', 'Vittoria', 'Ludovica', 'Matilde', 'Chiara', 'Francesca', 'Sara', 'Martina', 'Giorgia', 'Elena', 'Anna', 'Valentina', 'Alessia', 'Federica', 'Camilla', 'Bianca', 'Rosa', 'Lucia'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Caruso'],
  },
  es: {
    name: 'Spain', flag: '🇪🇸', adj: 'Spanish', econ: 0.65, tax: 0.25, drink: 18, drive: 18, freeHealth: true, monarchy: true,
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Bilbao', 'Granada', 'Palma'],
    m: ['Hugo', 'Martín', 'Lucas', 'Mateo', 'Leo', 'Daniel', 'Alejandro', 'Pablo', 'Manuel', 'Álvaro', 'Adrián', 'David', 'Mario', 'Diego', 'Javier', 'Sergio', 'Carlos', 'Jorge', 'Iván', 'Marcos', 'Rubén', 'Raúl', 'Gonzalo', 'Nicolás'],
    f: ['Lucía', 'Sofía', 'Martina', 'María', 'Julia', 'Paula', 'Valeria', 'Emma', 'Daniela', 'Carla', 'Alba', 'Noa', 'Olivia', 'Sara', 'Carmen', 'Laura', 'Elena', 'Irene', 'Marta', 'Claudia', 'Ana', 'Nerea', 'Ainhoa', 'Inés'],
    last: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez'],
  },
  se: {
    name: 'Sweden', flag: '🇸🇪', adj: 'Swedish', econ: 0.85, tax: 0.33, drink: 18, drive: 18, freeHealth: true, monarchy: true,
    cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping'],
    m: ['William', 'Liam', 'Noah', 'Hugo', 'Lucas', 'Oliver', 'Elias', 'Alexander', 'Adam', 'Axel', 'Erik', 'Lars', 'Anders', 'Johan', 'Karl', 'Nils', 'Oskar', 'Gustav', 'Viktor', 'Emil', 'Filip', 'Leo', 'Isak', 'Magnus'],
    f: ['Alice', 'Maja', 'Elsa', 'Astrid', 'Wilma', 'Freja', 'Ebba', 'Olivia', 'Selma', 'Alma', 'Ella', 'Saga', 'Agnes', 'Linnea', 'Ingrid', 'Karin', 'Sofia', 'Emma', 'Klara', 'Julia', 'Ida', 'Elin', 'Hanna', 'Tove'],
    last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Jönsson', 'Lindberg', 'Jakobsson', 'Magnusson', 'Olofsson', 'Lindström', 'Lindqvist', 'Berg', 'Axelsson'],
  },
  jp: {
    name: 'Japan', flag: '🇯🇵', adj: 'Japanese', econ: 0.75, tax: 0.22, drink: 20, drive: 18, freeHealth: true, monarchy: true,
    cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kyoto', 'Kobe', 'Sendai'],
    m: ['Haruto', 'Sota', 'Yuto', 'Riku', 'Hinata', 'Minato', 'Ren', 'Yamato', 'Hiroshi', 'Takashi', 'Kenji', 'Daiki', 'Kaito', 'Shota', 'Ryota', 'Takumi', 'Yuki', 'Kazuki', 'Haruki', 'Sho', 'Kenta', 'Tatsuya', 'Naoki', 'Akira'],
    f: ['Himari', 'Hina', 'Yui', 'Sakura', 'Aoi', 'Mei', 'Rin', 'Yuna', 'Akari', 'Hana', 'Mio', 'Yuka', 'Saki', 'Ayaka', 'Misaki', 'Nanami', 'Haruka', 'Emi', 'Keiko', 'Yumi', 'Natsuki', 'Kana', 'Riko', 'Momoka'],
    last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto'],
  },
  kr: {
    name: 'South Korea', flag: '🇰🇷', adj: 'Korean', econ: 0.7, tax: 0.2, drink: 19, drive: 18, freeHealth: true,
    cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan', 'Suwon'],
    m: ['Min-jun', 'Seo-jun', 'Do-yun', 'Ye-jun', 'Si-woo', 'Ha-jun', 'Ji-ho', 'Joon-young', 'Hyun-woo', 'Jae-won', 'Sung-min', 'Dong-hyun', 'Tae-yang', 'Ji-hoon', 'Woo-jin', 'Seung-ho', 'Jin-woo', 'Kyung-soo', 'Sang-woo', 'Young-ho', 'Jun-seo', 'Eun-woo', 'Min-ho', 'Dae-jung'],
    f: ['Seo-yeon', 'Seo-yun', 'Ji-woo', 'Ha-eun', 'Min-seo', 'Ha-yoon', 'Ji-yoo', 'Soo-ah', 'Ji-min', 'Yu-na', 'Chae-won', 'Da-eun', 'Eun-ji', 'Hye-jin', 'Su-bin', 'Ye-eun', 'Na-yeon', 'So-yeon', 'Ji-hye', 'Min-ji', 'Hae-won', 'Seul-gi', 'Yeon-woo', 'Bo-ra'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong', 'Jeon', 'Ko', 'Moon', 'Yang'],
  },
  in: {
    name: 'India', flag: '🇮🇳', adj: 'Indian', econ: 0.2, tax: 0.15, drink: 21, drive: 18,
    cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Kochi'],
    m: ['Aarav', 'Vihaan', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan', 'Rahul', 'Amit', 'Vikram', 'Rajesh', 'Sanjay', 'Anil', 'Karan', 'Nikhil', 'Siddharth', 'Varun', 'Kabir', 'Dev', 'Yash', 'Pranav'],
    f: ['Saanvi', 'Aanya', 'Aadhya', 'Ananya', 'Pari', 'Diya', 'Myra', 'Sara', 'Ira', 'Priya', 'Neha', 'Pooja', 'Kavya', 'Riya', 'Sneha', 'Divya', 'Anjali', 'Meera', 'Lakshmi', 'Isha', 'Nisha', 'Shreya', 'Tanvi', 'Aditi'],
    last: ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Rao', 'Iyer', 'Nair', 'Mehta', 'Shah', 'Joshi', 'Kapoor', 'Malhotra', 'Chopra', 'Bose', 'Banerjee', 'Das', 'Mukherjee', 'Pillai', 'Menon', 'Agarwal', 'Desai'],
  },
  ng: {
    name: 'Nigeria', flag: '🇳🇬', adj: 'Nigerian', econ: 0.15, tax: 0.12, drink: 18, drive: 18,
    cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Enugu', 'Kaduna'],
    m: ['Chinedu', 'Emeka', 'Oluwaseun', 'Tunde', 'Adebayo', 'Ifeanyi', 'Chukwuemeka', 'Babajide', 'Obinna', 'Femi', 'Kelechi', 'Uche', 'Musa', 'Ibrahim', 'Abubakar', 'Segun', 'Kayode', 'Nnamdi', 'Olumide', 'Chidi', 'Yusuf', 'Daniel', 'David', 'Samuel'],
    f: ['Chiamaka', 'Ngozi', 'Adaeze', 'Funmilayo', 'Folake', 'Amaka', 'Nneka', 'Ifeoma', 'Chioma', 'Aisha', 'Fatima', 'Zainab', 'Bukola', 'Yetunde', 'Temitope', 'Blessing', 'Precious', 'Esther', 'Halima', 'Oluwakemi', 'Uchenna', 'Adaora', 'Kemi', 'Ronke'],
    last: ['Okafor', 'Okonkwo', 'Adeyemi', 'Oladipo', 'Eze', 'Nwosu', 'Abubakar', 'Bello', 'Ogunleye', 'Ibrahim', 'Mohammed', 'Adebayo', 'Obi', 'Chukwu', 'Okoro', 'Afolabi', 'Balogun', 'Uche', 'Nwachukwu', 'Okeke', 'Lawal', 'Danjuma', 'Ojo', 'Aliyu'],
  },
  ph: {
    name: 'Philippines', flag: '🇵🇭', adj: 'Filipino', econ: 0.2, tax: 0.15, drink: 18, drive: 17,
    cities: ['Manila', 'Quezon City', 'Cebu City', 'Davao', 'Makati', 'Baguio', 'Iloilo'],
    m: ['Jose', 'Juan', 'Mark', 'John Paul', 'Christian', 'Angelo', 'Carlo', 'Miguel', 'Rafael', 'Gabriel', 'Paolo', 'Joshua', 'Jerome', 'Ramon', 'Antonio', 'Jericho', 'Nathaniel', 'Lorenzo', 'Adrian', 'Kenneth', 'Vincent', 'Marvin', 'Ronaldo', 'Emilio'],
    f: ['Maria', 'Angel', 'Princess', 'Mary Joy', 'Kristine', 'Andrea', 'Nicole', 'Camille', 'Patricia', 'Jasmine', 'Bea', 'Joanna', 'Rosalie', 'Liza', 'Grace', 'Kimberly', 'Althea', 'Janelle', 'Precious', 'Ana', 'Lea', 'Jessa', 'Rica', 'Erlinda'],
    last: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 'Dela Cruz', 'Gonzales', 'Lim', 'Tan'],
  },
  za: {
    name: 'South Africa', flag: '🇿🇦', adj: 'South African', econ: 0.3, tax: 0.22, drink: 18, drive: 18,
    cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Gqeberha', 'Bloemfontein', 'Polokwane'],
    m: ['Thabo', 'Sipho', 'Bongani', 'Lwazi', 'Kagiso', 'Tshepo', 'Mandla', 'Lethabo', 'Johan', 'Pieter', 'Ruan', 'Dylan', 'Liam', 'Ethan', 'Sibusiso', 'Themba', 'Kabelo', 'Neo', 'Musa', 'Andile', 'Jabulani', 'Wian', 'Michael', 'Junior'],
    f: ['Lerato', 'Thandiwe', 'Naledi', 'Zanele', 'Nomvula', 'Palesa', 'Busisiwe', 'Amahle', 'Lindiwe', 'Ayanda', 'Refilwe', 'Khanyisile', 'Precious', 'Mbali', 'Anika', 'Lize', 'Marike', 'Chloe', 'Megan', 'Nicole', 'Zinhle', 'Nandi', 'Thando', 'Karabo'],
    last: ['Nkosi', 'Dlamini', 'Ndlovu', 'Khumalo', 'Mokoena', 'Mthembu', 'Botha', 'Van der Merwe', 'Pretorius', 'Naidoo', 'Molefe', 'Sithole', 'Zulu', 'Mahlangu', 'Van Wyk', 'Smith', 'Jacobs', 'Mabaso', 'Ngcobo', 'Mkhize', 'Petersen', 'Venter', 'Le Roux', 'Govender'],
  },
};
const COUNTRY_IDS = Object.keys(COUNTRIES);

// Family wealth tiers at birth: starting household money and the jobs the parents tend to hold.
const WEALTH = {
  poor: { name: 'Struggling', money: [0, 4000], jobs: ['fastfood', 'retail', 'janitor', 'warehouse', 'farm', 'security', 'server', null, null] },
  modest: { name: 'Working class', money: [3000, 25000], jobs: ['warehouse', 'delivery', 'construction', 'retail', 'callcenter', 'mechanic', 'stylist', 'mail', 'receptionist'] },
  middle: { name: 'Middle class', money: [20000, 120000], jobs: ['teacher', 'nurse', 'electrician', 'plumber', 'police', 'accountant', 'marketing', 'it', 'firefighter', 'hr', 'bank'] },
  comfortable: { name: 'Well-off', money: [100000, 600000], jobs: ['software', 'engineer', 'pharmacist', 'architect', 'finance', 'lawyer', 'dentist', 'data', 'pilot'] },
  rich: { name: 'Wealthy', money: [1500000, 25000000], jobs: ['executive', 'doctor', 'surgeon', 'lawyer', 'finance', 'realestate', 'judge'] },
};
const WEALTH_IDS = ['poor', 'modest', 'middle', 'comfortable', 'rich'];
