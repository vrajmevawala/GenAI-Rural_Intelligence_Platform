import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
});

export const getCrops = () => API.get('/crops/');
export const registerFarmer = (data) => API.post('/farmers/register', data);
export const loginFarmer = (data) => API.post('/farmers/login', data);
export const getFarmer = (farmerId) => API.get(`/farmers/${farmerId}`);
export const updateFarmerLanguage = (farmerId, language) => API.put(`/farmers/${farmerId}/language?language=${language}`);
export const getFVI = (farmerId) => API.get(`/farmers/${farmerId}/fvi`);
export const getAlert = (farmerId) => API.get(`/farmers/${farmerId}/alert`);

export default API;
