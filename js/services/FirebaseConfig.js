/**
 * ========================================
 * FIREBASE CONFIG
 * ========================================
 */

const firebaseConfig = {
    apiKey: "AIzaSyAX35dNZwU738G3EDNWh9jl2EdzQcu6nZg",
    authDomain: "cesar-iluminacion.firebaseapp.com",
    databaseURL: "https://cesar-iluminacion-default-rtdb.firebaseio.com",
    projectId: "cesar-iluminacion",
    storageBucket: "cesar-iluminacion.firebasestorage.app",
    messagingSenderId: "582945352828",
    appId: "1:582945352828:web:0ab75af28639941afcedf9"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Base de datos disponible globalmente
const db = firebase.firestore();

console.log('%c🔥 Firebase conectado', 'color: #ff6d00; font-weight: bold;');