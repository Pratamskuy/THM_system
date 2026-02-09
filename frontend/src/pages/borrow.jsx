import { useState, useEffect } from 'react';
import { borrowAPI, itemAPI, returnAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Borrows() {
  const { isAdminOrPetugas } = useAuth();
  const [borrows, setBorrows] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    id_items: '',
    item_count: 1,
    return_date_expected: '',
    notes: '',
  });

  useEffect(() => {
    loadBorrows();
    loadAvailableItems();
  }, [filter]);

  const loadBorrows = async () => {
    try {
      let res;
      if (isAdminOrPetugas()) {
        if (filter === 'pending') {
          res = await borrowAPI.getPending();
        } else if (filter === 'active') {
          res = await borrowAPI.getActive();
        } else {
          res = await borrowAPI.getAll();
        }
      } else {
        res = await borrowAPI.getMy();
      }
      setBorrows(res.data || []);
    } catch (error) {
      console.error('Failed to load borrows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableItems = async () => {
    try {
      const res = await itemAPI.getAvailable();
      setItems(res.data || []);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await borrowAPI.create(formData);
      loadBorrows();
      closeModal();
      alert('Borrow request submitted successfully!');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleApprove = async (id) => {
    try {
      await borrowAPI.approve(id);
      loadBorrows();
      alert('Borrow request approved!');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReject = async (id) => {
    const notes = prompt('Reason for rejection:');
    if (notes) {
      try {
        await borrowAPI.reject(id, notes);
        loadBorrows();
        alert('Borrow request rejected!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleRequestReturn = async (id) => {
    if (window.confirm('Request to return this item?')) {
      try {
        await borrowAPI.requestReturn(id);
        loadBorrows();
        alert('Return request submitted!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleConfirmReturn = async (id) => {
    if (window.confirm('Confirm return for this borrow?')) {
      try {
        await returnAPI.confirm(id);
        loadBorrows();
        alert('Return confirmed!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const openCreateModal = () => {
    setFormData({
      id_items: '',
      item_count: 1,
      return_date_expected: '',
      notes: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="flex justify-between items-center">
          <h1 className="card-header">
            {isAdminOrPetugas() ? 'Borrow Requests Management' : 'My Borrows'}
          </h1>
          {!isAdminOrPetugas() && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              + New Borrow Request
            </button>
          )}
        </div>

        {isAdminOrPetugas() && (
          <div className="btn-group mt-2">
            <button
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('active')}
            >
              Active
            </button>
          </div>
        )}
      </div>

      <div className="card">
        {borrows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No borrow requests found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  {isAdminOrPetugas() && <th>Borrower</th>}
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Borrow Date</th>
                  <th>Expected Return</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrows.map((borrow) => (
                  <tr key={borrow.id}>
                    <td>#{borrow.id}</td>
                    {isAdminOrPetugas() && <td>{borrow.nama_peminjam}</td>}
                    <td>{borrow.item_name}</td>
                    <td>{borrow.item_count}</td>
                    <td>{new Date(borrow.borrow_date).toLocaleDateString()}</td>
                    <td>{new Date(borrow.return_date_expected).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${borrow.status}`}>
                        {borrow.status}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        {isAdminOrPetugas() && borrow.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleApprove(borrow.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReject(borrow.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                                {isAdminOrPetugas() && borrow.status === 'waiting for return' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleConfirmReturn(borrow.id)}
                          >
                            ACC Return
                          </button>
                        )}
                        {!isAdminOrPetugas() && borrow.status === 'taken' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleRequestReturn(borrow.id)}
                          >
                            Request Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Borrow Request</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Item *</label>
                <select
                  className="form-select"
                  value={formData.id_items}
                  onChange={(e) => setFormData({...formData, id_items: e.target.value})}
                  required
                >
                  <option value="">Choose an item...</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} (Available: {item.available})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.item_count}
                  onChange={(e) => setFormData({...formData, item_count: e.target.value})}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Return Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.return_date_expected}
                  onChange={(e) => setFormData({...formData, return_date_expected: e.target.value})}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Purpose of borrowing..."
                />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Borrows;