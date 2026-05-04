export const cars = [
  {
    id: '1',
    name: 'Porsche 911 Carrera S',
    category: 'Sportive',
    price: 590,
    description:
      "Icone intemporelle, performances explosives et confort haut de gamme pour vos week-ends d'exception.",
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600',
    seats: 2,
    transmission: 'Automatique',
    fuel: 'Essence',
    power: '450 ch',
  },
  {
    id: '2',
    name: 'Range Rover Sport',
    category: 'SUV Premium',
    price: 420,
    description:
      "SUV de luxe polyvalent, parfait pour les deplacements professionnels et les sejours en famille.",
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=1600',
    seats: 5,
    transmission: 'Automatique',
    fuel: 'Diesel',
    power: '350 ch',
  },
  {
    id: '3',
    name: 'Mercedes Classe S',
    category: 'Berline de luxe',
    price: 480,
    description:
      "Reference absolue en matiere de confort, ideale pour transferts aeroport et evenements d'entreprise.",
    image: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?q=80&w=1600',
    seats: 5,
    transmission: 'Automatique',
    fuel: 'Hybride',
    power: '435 ch',
  },
  {
    id: '4',
    name: 'BMW X5 M',
    category: 'SUV Premium',
    price: 450,
    description:
      'Un SUV sportif et raffine, ideal pour allier confort, espace et sensations.',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1600',
    seats: 5,
    transmission: 'Automatique',
    fuel: 'Essence',
    power: '625 ch',
  },
];

export function findCar(carId) {
  if (carId === undefined || carId === null) {
    return undefined;
  }

  return cars.find((car) => String(car.id) === String(carId));
}
