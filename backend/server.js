var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var session = require("express-session");
var otpRoutes = require("./routes/otpRoutes");
var otpRoutes1 = require("./routes/otpRoutes1");
var axios = require("axios");
var encodeURIComponent = require("querystring").escape;

var rawPassword = "Harshit@123";
var encodedPassword = encodeURIComponent(rawPassword);

var uri = `mongodb+srv://harshit:${encodedPassword}@cluster0.csw5jmw.mongodb.net/split?retryWrites=true&w=majority&appName=Cluster0`;
var dbName = "split";
var db;
var {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Transaction,
} = require("mongodb");
const { group } = require("console");

async function initializeDatabase() {
  try {
    var client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    console.log("Connected to MongoDB");

    db = client.db(dbName);
    await db.createCollection("split");
    await db.createCollection("groups");
    await db.createCollection("transactions");
    console.log("Collection created!");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
}

initializeDatabase();

var app = express();
var port = 3001;

app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use("/api", otpRoutes);
app.use("/apilogin", otpRoutes1);
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
async function queryDatabase(email) {
  var client;
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    console.log("Connected to MongoDB");

    var db = client.db(dbName);
    var query = { email: email };

    var result = await db.collection("split").find(query).toArray();
    return result;
  } catch (err) {
    console.error("Failed to query the database:", err);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}
app.post("/oauth2callback", async (req, res) => {
  function isPlainObject(obj) {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
  }
  console.log(isPlainObject(req.body));
  console.log(req.body);
  var code = req.body.codes;
  var email = req.body.email;
  console.log("the code is ", code);
  console.log(email);

  try {
    try {
      var allContacts = [];
      var nextPageToken = null;

      do {
        var response = await axios.get(
          "https://people.googleapis.com/v1/people/me/connections",
          {
            params: {
              personFields: "emailAddresses", // Include phone numbers
              pageToken: nextPageToken, // Token for the next page of results
            },
            headers: {
              Authorization: `Bearer ${code}`,
            },
          }
        );
        if (response.data.connections) {
          allContacts = allContacts.concat(response.data.connections);
        }
        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);
      console.log("hello");
      var query = { email: email };
      var result = await queryDatabase(email);
      allContacts = allContacts.filter(
        (contact) => contact.emailAddresses && contact.emailAddresses.length > 0
      );
      result = result[0];
      var friends = [];
      console.log(allContacts);
      console.log(result);
      if (Array.isArray(result.friends)) {
        friends = result.friends;
      } else {
      }
      console.log(allContacts.length);
      for (var i = 0; i < allContacts.length; i++) {
        console.log(allContacts[i].emailAddresses);
        for (var j = 0; j < allContacts[i].emailAddresses.length; j++) {
          if (friends.includes(allContacts[i].emailAddresses[j].value)) {
            continue;
          }
          if (allContacts[i].emailAddresses[j].value == email) {
            continue;
          }

          query = { email: allContacts[i].emailAddresses[j].value };
          // var result = await db.collection("split").find(query).toArray();
          // console.log("hello");
          // console.log(result);
          // if(result.length==0)
          // {
          //   continue
          // }
          // else{
          friends.push(allContacts[i].emailAddresses[j].value);
          console.log(allContacts[i].emailAddresses[j].value);
          break;

          // }
        }
      }
      console.log("here");
      console.log(friends);

      await db.collection("split").updateOne(
        { email: email }, // Filter criteria
        { $set: { friends: friends } } // Update operation
      );
      if (!Array.isArray(result.groups)) {
        await db.collection("split").updateOne(
          { email: email }, // Filter criteria
          { $set: { groups: [] } } // Update operation
        );
      }

      res.send("done");
    } catch (error) {
      // console.log(error);
      res.status(500).send(error);
    }
  } catch (error) {
    res.status(500).send(error);
    console.log("not done succesful");
    console.log(error);
  }
});

app.get("/contacts", async (req, res) => {
  var { email } = req.query;
  try {
    console.log(email);

    var result = await queryDatabase(email);
    result = result[0];
    var allContacts = [];
    if (Array.isArray(result.friends)) {
      allContacts = result.friends;
    } else {
    }
    res.send(allContacts);
  } catch (error) {
    // console.log(error);
    res.status(500).send(error);
  }
});

app.post("/create-group", async (req, res) => {
  var { groupName, contacts, creator } = req.body;

  for (const email of contacts) {
    var contact = await queryDatabase(email);
    console.log(contact);
    if (!contact || (Array.isArray(contact) && contact.length === 0)) {
      return res.status(400).json({ error: `Email ${email} does not exist` });
    }
  }
  try {
    // Create a new group
    var newGroup = {
      name: groupName,
      members: [...contacts, creator],
      creator: creator,
    };

    // Insert the new group into the groups collection
    var result = await db.collection("groups").insertOne(newGroup);

    if (result.insertedId) {
      // Update each member's record with the new group ID
      var bulkOps = [...contacts, creator].map((email) => ({
        updateOne: {
          filter: { email: email },
          update: {
            $addToSet: { groups: result.insertedId.toString() },
          },
        },
      }));

      await db.collection("split").bulkWrite(bulkOps);

      res.status(201).json({
        message: "Group created successfully and member records updated",
        groupId: result.insertedId,
      });
    } else {
      res.status(500).send("Failed to create group");
    }
  } catch (error) {
    console.error("Error creating group or updating member records:", error);
    res
      .status(500)
      .send(
        "An error occurred while creating the group or updating member records"
      );
  }
});
app.get("/groups", async (req, res) => {
  try {
    var { email } = req.query;
    var contact = await queryDatabase(email);
    if (!contact) {
      return res.status(404).send("Contact not found");
    }
    contact = contact[0];

    var groupIds = contact.groups;
    var groups = [];
    console.log(contact);

    for (var i = 0; i < groupIds.length; i++) {
      var ad = {
        groupName: "",
        groupid: "",
      };
      var group = await db
        .collection("groups")
        .findOne({ _id: new ObjectId(groupIds[i]) });
      console.log(group);
      ad.groupName = group.name;
      ad.groupid = groupIds[i];
      groups.push(ad);
    }

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/friends", async (req, res) => {
  try {
    console.log(req.body);
    var emailf = req.body.emailfriend;
    var email = req.body.email;
    var result = await queryDatabase(emailf);
    if (result.length == 0) {
      res.status(500).send("error");
    } else {
      result = await queryDatabase(email);
      result = result[0];
      console.log(result);
      var allContacts = result.friends;
      if (allContacts.includes(emailf)) {
      } else {
        allContacts.push(emailf);
        await db.collection("split").updateOne(
          { email: email }, // Filter criteria
          { $set: { friends: allContacts } } // Update operation
        );
      }
      res.status(200).send("done");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("error");
  }
});
async function queryDatabase1(id) {
  let client;

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const result = await db
      .collection("groups")
      .findOne({ _id: new ObjectId(id) });

    return result;
  } catch (err) {
    console.error("Failed to query the database:", err);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}
app.get("/members", async (req, res) => {
  try {
    var { email } = req.query;
    var { id } = req.query;
    var result = await queryDatabase1(id);
    var a = [];
    for (var i = 0; i < result.members.length; i++) {
      if (email === result.members[i]) {
        continue;
      }
      a.push(result.members[i]);
    }
    res.status(200).send(a);
  } catch (error) {
    console.log(error);
    res.status(500).send("error");
  }
});
app.post("/transactions", async (req, res) => {
  console.log(req.body);
  var id = req.body.group;
  var amount = req.body.amount;
  var fullamount = req.body.isFullAmountOwed;
  var selectedpeople = req.body.selectedPeople;
  var email = req.body.towhom;
  try {
    let result = fullamount
      ? amount / selectedpeople.length
      : amount / (selectedpeople.length + 1);

    // Create a new group
    var newtransaction = {
      group: id,
      involved: selectedpeople,
      towhom: email,
      amount: result,
    };

    // Insert the new group into the groups collection
    await db.collection("transactions").insertOne(newtransaction);

    // Update each member's record with the new group ID

    res.status(200).json("transaction added");
  } catch (error) {
    console.error("Error creating group or updating member records:", error);
    res
      .status(500)
      .send(
        "An error occurred while creating the group or updating member records"
      );
  }
});
async function fetch(id) {
  try {
    const result = await db
      .collection("transactions")
      .find({ group: id })
      .toArray();
    const r1 = await db.collection("transactions").find().toArray();
    console.log(r1);
    return result;
  } catch (err) {
    return -1;
  }
}
app.get("/transactions", async (req, res) => {
  try {
    const { id } = req.query;
    const result = await fetch(id);
    if (result === -1) {
      res.status(500).send("Error fetching transactions");
    } else {
      res.send(result);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/summary", async (req, res) => {
  const { id, email } = req.body;
  try {
    const transactions = await db
      .collection("transactions")
      .find({
        group: id,
      })
      .toArray();
    const grp = await db.collection("groups").findOne({
      _id: new ObjectId(id),
    });
    const emailToIndex = {};
    grp.members.forEach((email, index) => {
      emailToIndex[email] = index;
    });

    // Create an n*n matrix initialized with zeros
    const n = grp.members.length;
    const matrix = Array(n)
      .fill()
      .map(() => Array(n).fill(0));

    transactions.forEach((transaction) => {
      const toWhomIndex = emailToIndex[transaction.towhom];
      transaction.involved.forEach((involvedPerson) => {
        const involvedIndex = emailToIndex[involvedPerson];
        matrix[involvedIndex][toWhomIndex] += transaction.amount;
        matrix[toWhomIndex][involvedIndex] -= transaction.amount;
      });
    });
    const userIndex = emailToIndex[email];

        const personalSummary = grp.members.reduce((summary, memberEmail, index) => {
            if (memberEmail !== email) {
                const amount = matrix[userIndex][index];
                if (amount !== 0) {
                    summary[memberEmail] = amount;
                }
            }
            return summary;
        }, {});

        res.status(200).json({
            email: email,
            summary: personalSummary
        });
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).send("An error occurred while fetching summary");
  }
});

app.post("/settle", async (req, res) => {
  const { id, email, settleEmail, amount,flag } = req.body;

  if (!id || !email || !settleEmail || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
      // Verify that both users are in the group
      const grp = await db.collection("groups").findOne({
          _id: new ObjectId(id),
      });

      if (!grp || !grp.members.includes(email) || !grp.members.includes(settleEmail)) {
          return res.status(400).json({ error: 'Invalid group or users' });
      }

      // Create a new transaction to represent the settlement
      let settlementTransaction;

if (flag) {
  settlementTransaction = {
    group: id,
    towhom: email,
    involved: [settleEmail],
    amount: amount,
    isSettlement: true,
    date: new Date()
  };
} else {
  settlementTransaction = {
    group: id,
    towhom: settleEmail,
    involved: [email],
    amount: amount,
    isSettlement: true,
    date: new Date()
  };
}

await db.collection("transactions").insertOne(settlementTransaction);


      // Fetch all transactions for the group
      const transactions = await db
          .collection("transactions")
          .find({
              group: id,
          })
          .toArray();

      // Create email to index mapping
      const emailToIndex = {};
      grp.members.forEach((memberEmail, index) => {
          emailToIndex[memberEmail] = index;
      });

      // Create an n*n matrix initialized with zeros
      const n = grp.members.length;
      const matrix = Array(n)
          .fill()
          .map(() => Array(n).fill(0));

      // Update matrix based on transactions
      transactions.forEach((transaction) => {
          const toWhomIndex = emailToIndex[transaction.towhom];
          transaction.involved.forEach((involvedPerson) => {
              const involvedIndex = emailToIndex[involvedPerson];
              matrix[involvedIndex][toWhomIndex] += transaction.amount;
              matrix[toWhomIndex][involvedIndex] -= transaction.amount;
          });
      });

      // Calculate personal summary for the settling user
      const userIndex = emailToIndex[email];
      const personalSummary = grp.members.reduce((summary, memberEmail, index) => {
          if (memberEmail !== email) {
              const amount = matrix[userIndex][index];
              if (amount !== 0) {
                  summary[memberEmail] = amount;
              }
          }
          return summary;
      }, {});

      res.status(200).json({
          message: 'Settlement successful',
          email: email,
          summary: personalSummary
      });
  } catch (error) {
      console.error("Error in settlement:", error);
      res.status(500).send("An error occurred during settlement");
  }
});