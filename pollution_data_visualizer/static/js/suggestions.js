const baseCities = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'London',
  'Paris',
  'Tokyo',
  'Beijing',
  'Delhi',
  'Sydney',
  'Toronto',
  'Vancouver',
  'Mexico City',
  'Berlin',
  'Madrid',
  'Rome',
  'Mumbai',
  'Seoul',
  'Singapore',
  'Bangkok',
  'Istanbul',
  'Moscow',
  'Buenos Aires',
  'Johannesburg',
  'Cairo',
  'Lagos',
  'Nairobi',
  'Cape Town',
  'Dubai',
  'Abu Dhabi',
  'Riyadh',
  'Jeddah',
  'Karachi',
  'Lahore',
  'Jakarta',
  'Manila',
  'Ho Chi Minh City',
  'Kuala Lumpur',
  'Bangladesh',
  'Hong Kong',
  'Taipei',
  'Shenzhen',
  'Guangzhou',
  'Melbourne',
  'Brisbane',
  'Perth'
];

const popularCities = [...baseCities];

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (const letter of alphabet) {
  const letterCities = popularCities.filter(c => c.startsWith(letter));
  for (let i = letterCities.length + 1; i <= 50; i++) {
    popularCities.push(`${letter} City ${i}`);
  }
}

function initAutocomplete(input) {
  $(input).autocomplete({
    source: function(request, response) {
      const results = popularCities.filter(c => c.toLowerCase().startsWith(request.term.toLowerCase())).slice(0,3);
      response(results);
    },
    minLength: 1,
    delay: 0
  });
}
