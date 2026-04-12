const   express = require("express");
const   database = require('@replit/database');

const   app = express();
const   db = new database();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("서버 동작 완료 ");
}   );

app.post("/save", async (req, res) => { 
  let list = (await db.get("list"))   || [];               list.push(req.body);
  await db.set("list", list);  
  res.json({ ok : true });            
});

app.get("/load", async (req, res) => {
  let list = (await db.get("list")) || [];
  res.json(list);
} );

app.listen(3000, () => console.log("서버 실행") 
);

  