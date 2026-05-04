import apiClient from "../api/apiClient";
import { mapPublicCar, normalizePublicCars } from "../utils/publicCars";

export async function fetchPublicCars(params = {}) {
  const response = await apiClient.get("/cars/voitures/public/", { params });
  const rawCars = normalizePublicCars(response.data);
  return rawCars.map(mapPublicCar).filter(Boolean);
}

export async function fetchPublicCarById(id) {
  if (!id) {
    return null;
  }

  const response = await apiClient.get(`/cars/voitures/${id}/public/`);
  return mapPublicCar(response.data);
}

export async function submitPublicReservation(payload) {
  const response = await apiClient.post("/reservations/public/", payload);
  return response.data;
}

export async function submitPublicContact(payload) {
  const response = await apiClient.post("/dashboard/contact/", payload);
  return response.data;
}
