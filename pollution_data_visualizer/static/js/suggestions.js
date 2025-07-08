const popularCities = [
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

function showSuggestions(input, container) {
  const value = input.value.toLowerCase();
  container.innerHTML = '';
  if (!value) return;
  popularCities.filter(c => c.toLowerCase().startsWith(value)).forEach(city => {
    const item = document.createElement('a');
    item.className = 'list-group-item list-group-item-action';
    item.textContent = city;
    item.addEventListener('click', () => {
      input.value = city;
      container.innerHTML = '';
    });
    container.appendChild(item);
  });
}
