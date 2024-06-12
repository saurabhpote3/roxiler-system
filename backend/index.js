const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const Transaction = require('./models/Transaction');
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/transactions');

app.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;
    await Transaction.deleteMany();
    await Transaction.insertMany(transactions);
    res.status(200).send('Database initialized with seed data');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/transactions', async (req, res) => {
  const { month, search, page = 1, perPage = 10 } = req.query;
  const query = {
    dateOfSale: { $regex: new RegExp(`-${month}-`, 'i') }
  };

  if (search) {
    query.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { price: parseFloat(search) }
    ];
  }

  try {
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));
    const total = await Transaction.countDocuments(query);
    res.status(200).json({ transactions, total });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/statistics', async (req, res) => {
  const { month } = req.query;
  const query = {
    dateOfSale: { $regex: new RegExp(`-${month}-`, 'i') }
  };

  try {
    const transactions = await Transaction.find(query);
    const totalSaleAmount = transactions.reduce((sum, t) => sum + t.price, 0);
    const soldItems = transactions.filter(t => t.sold).length;
    const notSoldItems = transactions.filter(t => !t.sold).length;

    res.status(200).json({
      totalSaleAmount,
      soldItems,
      notSoldItems
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/bar-chart', async (req, res) => {
  const { month } = req.query;
  const query = {
    dateOfSale: { $regex: new RegExp(`-${month}-`, 'i') }
  };

  try {
    const transactions = await Transaction.find(query);
    const priceRanges = [
      { range: '0-100', count: 0 },
      { range: '101-200', count: 0 },
      { range: '201-300', count: 0 },
      { range: '301-400', count: 0 },
      { range: '401-500', count: 0 },
      { range: '501-600', count: 0 },
      { range: '601-700', count: 0 },
      { range: '701-800', count: 0 },
      { range: '801-900', count: 0 },
      { range: '901-above', count: 0 }
    ];

    transactions.forEach(t => {
      const price = t.price;
      if (price <= 100) priceRanges[0].count++;
      else if (price <= 200) priceRanges[1].count++;
      else if (price <= 300) priceRanges[2].count++;
      else if (price <= 400) priceRanges[3].count++;
      else if (price <= 500) priceRanges[4].count++;
      else if (price <= 600) priceRanges[5].count++;
      else if (price <= 700) priceRanges[6].count++;
      else if (price <= 800) priceRanges[7].count++;
      else if (price <= 900) priceRanges[8].count++;
      else priceRanges[9].count++;
    });

    res.status(200).json(priceRanges);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/pie-chart', async (req, res) => {
  const { month } = req.query;
  const query = {
    dateOfSale: { $regex: new RegExp(`-${month}-`, 'i') }
  };

  try {
    const transactions = await Transaction.find(query);
    const categories = {};

    transactions.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + 1;
    });

    const result = Object.keys(categories).map(category => ({
      category,
      count: categories[category]
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/combined-data', async (req, res) => {
  const { month } = req.query;
  try {
    const [statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:5000/api/statistics?month=${month}`),
      axios.get(`http://localhost:5000/api/bar-chart?month=${month}`),
      axios.get(`http://localhost:5000/api/pie-chart?month=${month}`)
    ]);

    res.status(200).json({
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
