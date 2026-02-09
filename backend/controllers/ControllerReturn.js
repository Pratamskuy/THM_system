const returning_item = require('../models/kembali');
const borrow = require('../models/pinjam');
const item = require('../models/item');
const activityLog = require('../models/activityLog');

// ===== GET ALL PENGEMBALIAN =====
// Endpoint: GET /api/pengembalian
const getAll = (req, res) => {
    returning_item.getAll((err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data pengembalian",
                error: err.message
            });
        }
        res.status(200).json({
            success: true,
            message: "Berhasil mengambil data pengembalian",
            data: results
        });
    });
};

// ===== GET PENGEMBALIAN BY ID =====
// Endpoint: GET /api/pengembalian/:id
const getById = (req, res) => {
    const { id } = req.params;

    returning_item.getById(id, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data pengembalian",
                error: err.message
            });
        }
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "returning_item tidak ditemukan"
            });
        }
        res.status(200).json({
            success: true,
            data: results[0]
        });
    });
};

// ===== CREATE PENGEMBALIAN =====
// Endpoint: POST /api/pengembalian
// Memproses pengembalian alat
const create = (req, res) => {
    const { borrow_id, item_condition, notes } = req.body;
    const officer_id = req.user.id;

    // Validasi input
    if (!borrow_id) {
        return res.status(400).json({
            success: false,
            message: "ID borrow_data wajib diisi"
        });
    }

    // Ambil data borrow_data
    borrow.getById(borrow_id, (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "peminjaman tidak ditemukan"
            });
        }

        const borrow_data = results[0];

        // Cek apakah borrow_data statusnya 'dipinjam' atau 'menunggu_pengembalian'
        if (borrow_data.status !== 'taken' && borrow_data.status !== 'menunggu_pengembalian') {
            return res.status(400).json({
                success: false,
                message: "Status peminjaman tidak valid untuk dikembalikan"
            });
        }

        // Data untuk pengembalian
        const dataReturn = {
            borrow_id,
            officer_id,
            item_condition,
            notes,
            retunr_date_expected: borrow_data.retunr_date_expected
        };

        // Buat record pengembalian
        returning_item.create(dataReturn, (err, results) => {
            if (err) {
                // Jika sudah ada pengembalian untuk borrow_data ini
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({
                        success: false,
                        message: "borrow ini sudah dikembalikan"
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: "Gagal memproses pengembalian",
                    error: err.message
                });
            }

            // Update status borrow_data menjadi 'dikembalikan'
            borrow.updateStatus(borrow_id, 'dikembalikan', (err) => {
                if (err) console.error("Gagal update status borrow_data:", err);
            });

            // Kembalikan jumlah tersedia alat
            item.updateJumlahTersedia(borrow_data.id_items, borrow_data.jumlah_pinjam, 'tambah', (err) => {
                if (err) console.error("Gagal update jumlah alat:", err);
            });

            // Hitung denda untuk response (dengan kondisi)
            const { terlambat_hari, denda } = returning_item.hitungDenda(
                borrow_data.retunr_date_expected,
                new Date(),
                item_condition
            );

            // Catat log aktivitas
            activityLog.create({
                id_user: officer_id,
                aksi: 'CREATE',
                tabel_terkait: 'pengembalian',
                id_data: results.insertId,
                keterangan: `returning_item alat: ${borrow_data.nama_alat}. Denda: Rp ${denda}`
            }, () => { });

            res.status(201).json({
                success: true,
                message: "Berhasil memproses pengembalian",
                data: {
                    id: results.insertId,
                    terlambat_hari,
                    denda,
                    denda_formatted: `Rp ${denda.toLocaleString('id-ID')}`
                }
            });
        });
    });
};

const confirmReturn = async (req, res) => {
    try {
      const id = req.params.id;
      const officer_id = req.user.id;
  
      const peminjaman = await borrowModel.getById(id);
      if (!peminjaman) {
        return res.status(404).json({ msg: 'Peminjaman tidak ditemukan' });
      }
  
      if (peminjaman.status !== 'waiting for return') {
        return res.status(400).json({ msg: 'Status peminjaman tidak valid' });
      }
  
      // update return_data
      await returnModel.confirm(id, officer_id);
  
      // update peminjaman
      await borrowModel.updateStatus(id, 'returned');
  
      // balikin stok barang
      await itemModel.addStock(
        peminjaman.id_items,
        peminjaman.item_count
      );
  
      res.json({ msg: 'Pengembalian berhasil dikonfirmasi' });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };
  
// ===== DELETE PENGEMBALIAN =====
// Endpoint: DELETE /api/pengembalian/:id
const deletereturning_item = (req, res) => {
    const { id } = req.params;

    returning_item.deleteById(id, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal menghapus pengembalian",
                error: err.message
            });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "returning_item tidak ditemukan"
            });
        }

        // Catat log aktivitas
        activityLog.create({
            id_user: req.userId,
            aksi: 'DELETE',
            tabel_terkait: 'pengembalian',
            id_data: id,
            keterangan: `returning_item dihapus: ID ${id}`
        }, () => { });

        res.status(200).json({
            success: true,
            message: "Berhasil menghapus pengembalian"
        });
    });
};

// Export semua fungsi
module.exports = {
    getAll,
    getById,
    create,
    deletereturning_item,
    confirmReturn
};