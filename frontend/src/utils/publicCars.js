import { buildMediaUrl } from '../config/env';

export function normalizePublicCars(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export function getCarName(car) {
  if (!car || typeof car !== 'object') return 'Voiture';
  const marque = car.marque || '';
  const modele = car.modele || '';
  const full = `${marque} ${modele}`.trim();
  return full || car.nom || 'Voiture';
}

export function getCarImage(car) {
  if (!car || typeof car !== 'object') return '';

  const candidates = [
    car.image_url,
    car.image_principale,
    car.image,
    car.photo,
    car.photo_url,
    car.cover,
    car.couverture,
    Array.isArray(car.images) ? car.images[0]?.image : null,
  ];

  const first = candidates.find((value) => typeof value === 'string' && value.trim() !== '');
  if (!first) return '';

  return buildMediaUrl(first.trim());
}

export function mapPublicCar(car) {
  if (!car || typeof car !== 'object') {
    return null;
  }

  const name = getCarName(car);
  const image = getCarImage(car);

  return {
    id: String(car.id),
    name,
    category: car.categorie_label || car.categorie || '-',
    price: Number(car.prix_journalier || 0),
    description: car.description || '',
    image,
    seats: car.nombre_places || '-',
    transmission: car.transmission_label || car.transmission || '-',
    fuel: car.carburant || '-',
    power: car.puissance || '-',
    isPopular: Boolean(car.is_popular),
    isAvailable: Boolean(car.is_available),
  };
}
