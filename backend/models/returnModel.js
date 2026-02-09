const db = require('../db');

module.exports = {
  create(data) {
    return db.query(
      `INSERT INTO return_data 
       (borrow_id, user_id, status, requested_at) 
       VALUES (?, ?, ?, ?)`,
      [data.borrow_id, data.user_id, data.status, data.requested_at]
    );
  },

  findByBorrowId(borrow_id) {
    return db.query(
      `SELECT * FROM return_data WHERE borrow_id = ?`,
      [borrow_id]
    );
  },

  confirm(borrow_id, officer_id) {
    return db.query(
      `UPDATE return_data
       SET status = 'confirmed',
           confirmed_at = NOW(),
           officer_id = ?
       WHERE borrow_id = ?`,
      [officer_id, borrow_id]
    );
  }
};
