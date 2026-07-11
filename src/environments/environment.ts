export const environment = {
  production: false,
  appName: 'ActuaYa',
  appVersion: '0.1.0',
  apiBaseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3000/api',
  authToken: 'um_api_2026',
  storagePrefix: 'um_',
  emailjs: {
    serviceId: 'YOUR_SERVICE_ID',     // Se configura en https://www.emailjs.com/
    templateId: 'YOUR_TEMPLATE_ID',   // Template de renovación
    publicKey: 'YOUR_PUBLIC_KEY',      // Public Key de EmailJS
  },
  adminEmail: 'gonzalo@experiencias.pro',
  firebase: {
    apiKey: "AIzaSyA8rVISHGVxffHdJS6XAKaM87pG2t2QDcE",
    authDomain: "actuaya.co",
    projectId: "actuaya-7f88d",
    storageBucket: "actuaya-7f88d.firebasestorage.app",
    messagingSenderId: "720152148020",
    appId: "1:720152148020:web:8525abf3dc819837a3b261",
    measurementId: "G-LJLXYDMXL3"
  }
};
