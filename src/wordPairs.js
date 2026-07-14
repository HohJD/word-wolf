export const wordLibrary = [
  {
    category: "Food & Drink",
    pairs: [
      { villager: "Coffee", wolf: "Tea" },
      { villager: "Pizza", wolf: "Pasta" },
      { villager: "Burger", wolf: "Sandwich" },
      { villager: "Ice cream", wolf: "Frozen yogurt" },
      { villager: "Sushi", wolf: "Sashimi" },
      { villager: "Pancake", wolf: "Waffle" },
      { villager: "Ketchup", wolf: "Chili sauce" },
      { villager: "Ramen", wolf: "Spaghetti" },
      { villager: "Cake", wolf: "Muffin" },
      { villager: "Juice", wolf: "Smoothie" },
    ],
  },
  {
    category: "Animals",
    pairs: [
      { villager: "Dog", wolf: "Wolf" },
      { villager: "Cat", wolf: "Tiger" },
      { villager: "Crocodile", wolf: "Alligator" },
      { villager: "Frog", wolf: "Toad" },
      { villager: "Rabbit", wolf: "Hare" },
      { villager: "Dolphin", wolf: "Shark" },
      { villager: "Butterfly", wolf: "Moth" },
      { villager: "Crow", wolf: "Raven" },
      { villager: "Horse", wolf: "Donkey" },
      { villager: "Swan", wolf: "Duck" },
    ],
  },
  {
    category: "Places",
    pairs: [
      { villager: "Beach", wolf: "Swimming pool" },
      { villager: "Library", wolf: "Bookstore" },
      { villager: "Hotel", wolf: "Hostel" },
      { villager: "Cinema", wolf: "Theatre" },
      { villager: "Hospital", wolf: "Clinic" },
      { villager: "Mountain", wolf: "Hill" },
      { villager: "Forest", wolf: "Jungle" },
      { villager: "Airport", wolf: "Train station" },
      { villager: "Restaurant", wolf: "Café" },
      { villager: "Gym", wolf: "Park" },
    ],
  },
  {
    category: "Everyday Objects",
    pairs: [
      { villager: "Pen", wolf: "Pencil" },
      { villager: "Umbrella", wolf: "Raincoat" },
      { villager: "Sofa", wolf: "Bed" },
      { villager: "Backpack", wolf: "Handbag" },
      { villager: "Watch", wolf: "Bracelet" },
      { villager: "Mirror", wolf: "Window" },
      { villager: "Candle", wolf: "Lamp" },
      { villager: "Fan", wolf: "Air conditioner" },
      { villager: "Pillow", wolf: "Cushion" },
      { villager: "Towel", wolf: "Blanket" },
    ],
  },
  {
    category: "Transport",
    pairs: [
      { villager: "Car", wolf: "Motorcycle" },
      { villager: "Bus", wolf: "Train" },
      { villager: "Bicycle", wolf: "Scooter" },
      { villager: "Plane", wolf: "Helicopter" },
      { villager: "Boat", wolf: "Ship" },
      { villager: "Taxi", wolf: "Grab/Uber" },
      { villager: "Tram", wolf: "Monorail" },
      { villager: "Truck", wolf: "Van" },
    ],
  },
  {
    category: "Activities",
    pairs: [
      { villager: "Football", wolf: "Rugby" },
      { villager: "Swimming", wolf: "Diving" },
      { villager: "Singing", wolf: "Humming" },
      { villager: "Painting", wolf: "Drawing" },
      { villager: "Yoga", wolf: "Stretching" },
      { villager: "Chess", wolf: "Checkers" },
      { villager: "Reading", wolf: "Studying" },
      { villager: "Hiking", wolf: "Trekking" },
      { villager: "Dancing", wolf: "Aerobics" },
      { villager: "Cycling", wolf: "Running" },
    ],
  },
  {
    category: "Tech & Digital",
    pairs: [
      { villager: "Laptop", wolf: "Tablet" },
      { villager: "Email", wolf: "Text message" },
      { villager: "Photo", wolf: "Screenshot" },
      { villager: "Wi-Fi", wolf: "Bluetooth" },
      { villager: "Password", wolf: "Username" },
      { villager: "Headphones", wolf: "Earbuds" },
      { villager: "Emoji", wolf: "Sticker" },
      { villager: "Podcast", wolf: "Audiobook" },
      { villager: "App", wolf: "Website" },
      { villager: "Video call", wolf: "Voice call" },
    ],
  },
  {
    category: "Nature & Weather",
    pairs: [
      { villager: "Rain", wolf: "Snow" },
      { villager: "Sun", wolf: "Moon" },
      { villager: "River", wolf: "Lake" },
      { villager: "Cloud", wolf: "Fog" },
      { villager: "Star", wolf: "Planet" },
      { villager: "Tree", wolf: "Bush" },
      { villager: "Earthquake", wolf: "Volcano" },
      { villager: "Desert", wolf: "Savanna" },
    ],
  },
  {
    category: "Abstract / Feelings",
    pairs: [
      { villager: "Happy", wolf: "Excited" },
      { villager: "Tired", wolf: "Bored" },
      { villager: "Love", wolf: "Crush" },
      { villager: "Fear", wolf: "Worry" },
      { villager: "Dream", wolf: "Goal" },
      { villager: "Lie", wolf: "Secret" },
      { villager: "Anger", wolf: "Frustration" },
      { villager: "Sadness", wolf: "Loneliness" },
    ],
  },
  {
    category: "Fun 🎉",
    pairs: [
      { villager: "Homework", wolf: "Ice cream" },
    ],
  },
  {
    category: "Malaysia / Local 🇲🇾",
    pairs: [
      { villager: "Nasi lemak", wolf: "Nasi goreng" },
      { villager: "Teh tarik", wolf: "Kopi" },
      { villager: "Roti canai", wolf: "Thosai" },
      { villager: "Durian", wolf: "Nangka" },
      { villager: "Mamak", wolf: "Kopitiam" },
      { villager: "Pasar malam", wolf: "Pasar pagi" },
      { villager: "Grab", wolf: "Taxi" },
      { villager: "LRT", wolf: "MRT" },
      { villager: "Char kway teow", wolf: "Wonton mee" },
      { villager: "Satay", wolf: "Rendang" },
    ],
  },
];

export function getCategories() {
  return wordLibrary.map((c) => c.category);
}

export function getPairsForCategory(category) {
  return wordLibrary.find((c) => c.category === category)?.pairs ?? [];
}

export function pickRandomPair(category, usedPairs = []) {
  const pairs = getPairsForCategory(category);
  const available = pairs.filter(
    (p) => !usedPairs.some((u) => u.villager === p.villager)
  );
  const pool = available.length > 0 ? available : pairs;
  return pool[Math.floor(Math.random() * pool.length)];
}
