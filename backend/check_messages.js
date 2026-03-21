const { pool } = require('./src/config/db');

(async () => {
  try {
    const result = await pool.query(
      `SELECT direction, body, created_at FROM whatsapp_messages 
       WHERE conversation_id IN (SELECT id FROM whatsapp_conversations WHERE phone_number = '+919429681488') 
       ORDER BY created_at DESC LIMIT 10`
    );
    console.log('\n=== Messages for +919429681488 ===');
    result.rows.forEach(m => {
      const body_preview = m.body.substring(0, 60).replace(/\n/g, ' ');
      console.log(`[${m.direction}]\t${body_preview}...`);
    });
    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
