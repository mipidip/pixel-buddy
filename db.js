import pkg from 'pg';
const { Pool } = pkg;

// Şifreni doğrudan yazmak yerine .env dosyasından okumasını söylüyoruz
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, // <-- Artık gizli ve güvenli!
  port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Veri tabanına bağlanırken hata oluştu:', err.stack);
  }
  console.log('🚀 Pixel Buddy veri tabanına başarıyla bağlanıldı!');
  release();
});

// Eski module.exports yerine modern export kullanıyoruz
export default {
  query: (text, params) => pool.query(text, params),
};