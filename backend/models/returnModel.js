const db = require('../db');

const findByBorrowId = (borrow_id, callback) => {
  const query = `SELECT * FROM return_data WHERE borrow_id = ?`;
  db.query(query, [borrow_id], callback);
};

const create = (data, callback) => {
  const { borrow_id } = data;

  const query = `
       INSERT INTO return_data (borrow_id)
    VALUES (?)
  `;

  db.query(query, [borrow_id], callback);
};

module.exports = {
  findByBorrowId,
  create
};