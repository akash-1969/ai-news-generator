const express = require("express");

const cors = require("cors");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:");
  console.error(err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:");
  console.error(err);
});

const app = express();

const { gemini } = require("./gemini.js");
// from here we have to get that json data

const { groq } = require("./groq.js");

const fs = require("fs");

const path = require("path");

const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance();

// const { gemini } = require("./gemini.js");
// const { addUncaughtExceptionCaptureCallback } = require("process");

app.use(cors());

app.use(express.json());
app.use((req, res, next) => {
  console.log(
    `${req.method} ${req.url}`,
    "Origin:",
    req.headers.origin,
    "User-Agent:",
    req.headers["user-agent"],
  );
  next();
});

app.get("/", (req, res) => {
  res.send("F&O COPILOT ");
});

app.post("/analyze-stock", async (req, res) => {
  const { symbol, price, change, changePercent, headlines } = req.body;

  const prompt = `You are a professional equity research analyst.

Stock:
Symbol: ${symbol}
Price: ₹${price}
Daily Change: ${changePercent}%
Absolute Change: ${change}

Recent Headlines:
${headlines.join("\n")}

Generate:

1. Sentiment (Bullish/Bearish/Neutral)
2. Explain the possible reasons behind today's move.
3. Positive developments.
4. Risks.
5. Short investor takeaway.

Important:
- Do not assume headlines directly caused the move.
- If news sentiment and price action disagree, explain possible market reasons.
- Return only valid HTML.
- Use only h2, p, ul, li, strong tags
`;

  let analysis = null;
  try {
    analysis = await groq(prompt);
  } catch (err) {
    console.log("groq failed , trying gemini.", err.message);
    try {
      analysis = await gemini(prompt);
    } catch (err) {
      console.log("gemini falied as well ");
      return res.status(500).json({
        error: err.message,
      });
    }
  }

  return res.json({
    html: analysis,
  });
});
app.get("/api/quote/:symbol", async (req, res) => {
  // then pass this query to yahoosearch

  // getting the quote from yahoo , and frontend side pr fetch krke yeh json lena pdega na
  try {
    const symbol = req.params.symbol;

    const quote = await yahooFinance.quote(symbol);

    res.json({
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      previousClose: quote.regularMarketPreviousClose,
      volume: quote.regularMarketVolume,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/search", async (req, res) => {
  try {
    const name = req.query.q;
    // then we have to pass this in search
    const result = await yahooFinance.search(name);

    const topStocks = result.quotes
      .filter(
        (stock) =>
          (stock.name || stock.shortname || stock.longname) && stock.symbol,
      )
      .slice(0, 10)
      .map((stock) => {
        return {
          symbol: stock.symbol,
          name: stock.longname || stock.shortname || stock.name,
          exchange: stock.exchange,
          type: stock.quoteType,
        };
      });

    res.json(topStocks);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

app.post("/api/subscribe", async(req, res) => {
  try {
    const { email, symbol, frequency } = req.body;
    if (!email || !symbol || !frequency) {
      return res.status(400).json({
        success: false,
        message: "Email, symbol and frequency are required",
      });
    }
    const filePath = path.join(__dirname, "subscriptions.json");

    let subscriptions = [];

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");

      if (fileData) {
        subscriptions = JSON.parse(fileData);
      }
    }

    let userIndex = subscriptions.findIndex((user) => user.email === email);

    if (userIndex === -1) {
      // new user
      subscriptions.push({
        email: email,
        stocks: [],
        subscribedAt: new Date().toISOString(),
      });
      userIndex = subscriptions.length - 1;
    }

    const stockExists = subscriptions[userIndex].stocks.some(
      (s) => s.symbol === symbol,
    );

    if (!stockExists) {
      subscriptions[userIndex].stocks.push({
        symbol: symbol,
        frequency: frequency,
        addedAt: new Date().toISOString(),
        lastSent: new Date().toISOString()
      });
    } else {
      const stockIndex = subscriptions[userIndex].stocks.findIndex(
        (s) => s.symbol === symbol,
      );
      subscriptions[userIndex].stocks[stockIndex].frequency = frequency;
    }
    fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));

    // trigger a webhook , as new entry came , so check when to send him 

    try
{
   const response = await fetch("http://localhost:5678/webhook/send-initial-report", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        email,
        symbol,
        frequency
    })
  });
   console.log(
        "Webhook status:",
        response.status
    );

    const text = await response.text();

    console.log(
        "Webhook response:",
        text
    );

  console.log("Succesfull subscription ");
  }catch(err){
    console.log("Webhook failed",err.message);
  }
    res.json({
      success: true,
      message: `Subscribed to ${symbol} successfully `,
    });

  } catch (err) {
    console.error("Subscribe Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save subscription",
    });
  }
});

app.get("/api/history/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const result = await yahooFinance.chart(symbol, {
      period1: "2025-01-01",
      interval: "1d",
    });

    // filtering so that we can only have the clean and valid data
    const candles = result.quotes
      .filter(
        (candle) =>
          candle.open !== null &&
          candle.high !== null &&
          candle.close !== null &&
          candle.low !== null,
      )

      .map((candle) => {
        // return a json object
        return {
          time: candle.date.toISOString().split("T")[0],
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
      });

    console.log(candles);

    res.json(candles);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch historical data",
    });
  }
});


app.post("/api/update-last-sent",(req,res)=>{
  try{
  const {email,symbol} = req.body;
  const filePath = path.join(__dirname,"subscriptions.json");
  if(!fs.existsSync(filePath)){
    return res.status(500).json({
      sucess:false,
      message:"subscription not found "
    });
  }
  const subscriptions = JSON.parse(fs.readFileSync(filePath,"utf-8"));

  const user = subscriptions.find(user=>user.email === email);

  if(!user){
    return res.status(404).json({
          success: false,
          message: "User not found"
    });
  }

  const stock = user.stocks.find(stock=>stock.symbol === symbol);
   if (!stock) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
    }

        stock.lastSent = new Date().toISOString();

        fs.writeFileSync(
            filePath,
            JSON.stringify(subscriptions, null, 2)
        );

        res.json({
            success: true,
            message: "lastSent updated successfully"
        });
  
  }
  catch(err){
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
  }
  
})

app.get("/routes-test", (req, res) => {
  res.json({
    message: "correct server file running",
  });
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server Running on port ${port}`);
});
