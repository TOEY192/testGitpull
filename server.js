const { rejects } = require("assert");
const express = require("express");
const fs = require("fs");
const mysql = require("mysql2");
const { resolve } = require("path");
const app = express();
const port = 3000;

const connection = mysql.createConnection({
    host: "134.209.101.105",
    user: "gitest",
    password: "github",
    database: "eieieieie"
});

// เชื่อมต่อกับฐานข้อมูล
connection.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
        return;
    }
    console.log("Connected to MySQL!");
});

// เส้นทางหลัก
app.get("/", (req, res) => {
    res.send("Test get method");
});

// รันเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


//แสดงข้อมูล 
app.get("/customer", (req, res) => {
    connection.query("SELECT * FROM customer", (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

app.get("/products", (req, res) => {
    connection.query("SELECT * FROM product", (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

//เอาไว้เช็คชื่อซ้ำ
const checkName = async (tableName, name) => {
    const checkSql = `SELECT COUNT(*) AS count FROM \`${tableName}\` WHERE name = ?`;
    return new Promise((resolve, rejects) => {
        connection.query(checkSql, [name], (err, results) => {
            if (err) {
                return reject('Error checking customer: ' + err.message);
            }
            resolve(results[0].count > 0);
        });
    });
};

//insert 
const addCustomer = async (data) => {
    const tableName = 'customer';
    // ตรวจสอบว่าชื่อลูกค้าซ้ำหรือไม่
    try {
        const exists = await checkName(tableName, data.Name);
        if(exists) {
            console.log('Customer name already exists in the database.');
            deleteCustomer('2');
        }
        else {
            const addSql = 'INSERT INTO customer (CustomerID, employeeId, Name, Address, Phone, Email) VALUES (?, ?, ?, ?, ?, ?)';
            await new Promise((resolve, reject) => {
                connection.query(addSql, [data.CustomerID, data.EmployeeID, data.Name, data.Address, data.Phone, data.Email], (err, results) => {
                    if (err) {
                        return reject('Error adding data: ' + err.message);
                    }
                    resolve('Customer added successfully!')
                });
            })
            console.log('Customer added successfully!');
        }
    } catch (error) {
        console.log(error);
    }
};

const deleteCustomer = async (customerId) => {
    const checkSql = 'SELECT COUNT(*) AS count FROM customer WHERE CustomerID = ?';

    // ตรวจสอบว่ามีลูกค้าที่ต้องการลบอยู่ในฐานข้อมูลหรือไม่
    try {
        const results = await new Promise((resolve, reject) => {
            connection.query(checkSql, [customerId], (err, results) => {
                if (err) {
                    return reject('Error checking customer: ' + err.message);
                };
                resolve(results);
            });
        });
        //results = [{ count : เลขที่ได้จากการ query}]

        if (results[0].count === 0) {
            console.log('Customer with ID ' + customerId + ' does not exist in the database.');
        }
        else {
            const deleteSql = 'DELETE FROM customer WHERE CustomerID = ?';
            await new Promise((resolve, reject) => {
                connection.query(deleteSql, [customerId], (err, results) => {
                    if (err) {
                        return reject('Error deleting customer: ' + err.message);
                    }
                    resolve(results);
                })
            })
            // results = [{ affectedRows: จำนวนแถวที่มีการเปลี่ยนแปลง}]
            console.log('Customer with ID ' + customerId + ' has been deleted.');

            const sql = 'SELECT COUNT(*) AS count FROM customer';
            const countCustomer = await new Promise((resolve, reject) => {
                connection.query(sql, (err, countCustomer) => {
                    if (err) {
                        return reject('Error deleting customer: ' + err.message);
                    }
                    resolve(results);
                })
            })
            // countCustomer = [{ count : เลขที่ได้จากการ query}]
            //console.log('Total customers: ' + countCustomer[0].count);

            const setAutoIncrementSql = 'ALTER TABLE customer AUTO_INCREMENT = ?';
            await new Promise((resolve, reject) => {
                connection.query(setAutoIncrementSql, [countCustomer[0].count], (err, results) => {
                    if (err) {
                        return reject('Error deleting customer: ' + err.message);
                    }
                    resolve(results);
                })
            });
            // results = [{
            //     changedRows: 0,  // สำหรับการปรับค่า AUTO_INCREMENT จะไม่มีการเปลี่ยนแปลงแถวใดๆ
            //     warningCount: 0, // จำนวนคำเตือน
            //     message: 'Query OK, 0 rows affected' // ข้อความสถานะของการดำเนินการ
            // }]
            console.log('AUTO_INCREMENT value set to: ' +countCustomer[0].count);
        }
    } catch (error) {
        console.log(error);
    }
};

// อ่านข้อมูลจากไฟล์ JSON
// Endpoint สำหรับอ่านข้อมูลจากไฟล์ JSON
app.post("/import-customers", (req, res) => {
    fs.readFile('data/dataImportCustomer.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).send('Error reading file');
        }

        if (!data) {
            console.error('Error: data.json is empty.');
            return res.status(400).send('data.json is empty');
        }

        try {
            const customers = JSON.parse(data); // แปลงข้อมูล JSON เป็นอ็อบเจกต์

            // เพิ่มข้อมูลลูกค้าทีละคน
            (async () => {
                for (const customer of customers) {
                    await addCustomer(customer);
                }

                res.send('Customers imported successfully!');
            })();
        } catch (parseError) {
            console.error('Error parsing JSON: ' + parseError.message);
            return res.status(400).send('Error parsing JSON');
        }
    });
});


//PRODUCT
const addProduct = async (data) => {
    const tableName = 'product';
    try {
        const exists = await checkName(tableName, data.name);
        if(exists) {
            console.log('Product name already exists in the database.');
        }
        else {
            const addSql = 'INSERT INTO product (supplierId, name, price, type, quantity, sold) VALUES (?, ?, ?, ?, ?, ?)';
            await new Promise((resolve, reject) => {
                connection.query(addSql, [data.supplierId, data.name, data.price, data.type, data.quantity, data.sold], (err, results) => {
                    if (err) {
                        return reject('Error adding data: ' + err.message);
                    }
                    resolve(results);
                })
            });
            console.log('Product add Success!');
        };
    } catch (error) {
        console.error(error);
    }   
};

app.post("/import-products", (req, res) => {
    fs.readFile('data/dataImportProducts.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).send('Error reading file');
        }

        if (!data) {
            console.error('Error: data.json is empty.');
            return res.status(400).send('data.json is empty');
        }

        try {
            const products = JSON.parse(data); // แปลงข้อมูล JSON เป็นอ็อบเจกต์

            (async () => {
                for (const product of products) {
                    await addProduct(product);
                }

                res.send('Product imported successfully!');
            })();
        } catch (parseError) {
            console.error('Error parsing JSON: ' + parseError.message);
            return res.status(400).send('Error parsing JSON');
        }
    })
});

const updateProductQuantity = (productId, quantity) => {
    const updateSql = 'UPDATE product SET quantity = quantity + ? WHERE ProductID = ?';
    connection.query(updateSql, [quantity, productId], (err, results) => {
        if (err) {
            return console.log('Error can\'t update: ' + err.message);
        }
    });
}

const updateProductSold = (productId, amount) => {
    const updateSql = 'UPDATE product SET sold = sold + ? WHERE ProductID = ?'
    connection.query(updateSql, [amount, productId], (err, results) => {
        if (err) {
            return console.log('Error can\'t update: ' + err.message);
        }
    });
}

//SERVICE_RECORD
const addSalesRecord = (data) => {
    const sql = 'INSERT INTO salesRecord (customerId, employeeId, date, productId, amount, totalPrice) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [data.customerId, data.employeeId, data.date, data.productId, data.amount, data.totalPrice], (err, results) => {
        if (err) {
            return console.error('Error adding data: ' + err.message);
        }
        updateProductQuantity(data.productId, (-1 * data.amount));
        updateProductSold(data.productId, data.amount);

        console.log('Record Success!');
    })
}

app.post("/sale-record", (req, res) => {
    fs.readFile("data/dataSalesRecord.json", "utf8", (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).send('Error reading file');
        }

        if (!data) {
            console.error('Error: data.json is empty.');
            return res.status(400).send('data.json is empty');
        }

        try {
            const records = JSON.parse(data); // แปลงข้อมูล JSON เป็นอ็อบเจกต์

            (async () => {
                for (const record of records) {
                    await addSalesRecord(record);
                }

                res.send('Records imported successfully!');
            })();
        } catch (parseError) {
            console.error('Error parsing JSON: ' + parseError.message);
            return res.status(400).send('Error parsing JSON');
        }
    })
})

//SALE REPORT
const getTotalSales = () => {
    return new Promise((resolve, reject) => {
        const totalSaleSql = 'SELECT SUM(sold * price) AS TotalSales FROM product';
        connection.query(totalSaleSql, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results[0]?.TotalSales || 0);
        });
    });
};

const getTotalOrders = () => {
    return new Promise((resolve, reject) => {
        const totalOrdersSql = 'SELECT SUM(sold) AS TotalOrders FROM product';
        connection.query(totalOrdersSql, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results[0]?.TotalOrders || 0);
        });
    });
};

const getSalesByProduct = () => {
    return new Promise((resolve, reject) => {
        const salesByProductSql = 'SELECT name, SUM(sold * price) AS Sales FROM product GROUP BY name';
        connection.query(salesByProductSql, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};

const getBestSellingProducts = () => {
    return new Promise((resolve, reject) => {
        const bestSellingSql = 'SELECT name, SUM(sold) AS TotalSold FROM product GROUP BY name ORDER BY TotalSold DESC LIMIT 5';
        connection.query(bestSellingSql, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};

app.post("/sale-report", async (req, res) => {
    try {
        const [totalSales, totalOrders, salesByProduct, bestSellingProducts] = await Promise.all([
            getTotalSales(),
            getTotalOrders(),
            getSalesByProduct(),
            getBestSellingProducts()
        ]);

        let salesByProductHtml = salesByProduct.map(product =>
            `<li>${product.name}: $${product.Sales}</li>`
        ).join('');

        let bestSellingProductsHtml = bestSellingProducts.map(product =>
            `<li>${product.name}: Sold ${product.TotalSold} times</li>`
        ).join('');

        const responseHtml = `
            <h1>Sales Report</h1>
            <p><strong>Total Sales:</strong> $${totalSales}</p>
            <p><strong>Total Orders:</strong> ${totalOrders}</p>
            <h2>Sales by Product:</h2>
            <ul>${salesByProductHtml}</ul>
            <h2>Best Selling Products:</h2>
            <ul>${bestSellingProductsHtml}</ul>
        `;

        res.send(responseHtml);
    } catch (error) {
        console.error('Error fetching sales report:', error.message);
        res.status(500).send("Error fetching sales report");
    }
});
