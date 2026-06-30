

const stock = document.querySelector(".stock");

stock.addEventListener("keypress",(e)=>{
    if(e.key==="Enter"){
        const symbol = stock.value.trim();
        if(!symbol) return ;
        loadChart(symbol);
        loadData(symbol);
        loadOptions(symbol);
    }
});

const getUpdatesBtn= document.getElementById("getUpdatesBtn");

const userEmailInput = document.getElementById("userEmail");

const frequencySelect = document.getElementById("frequencySelect");

getUpdatesBtn.addEventListener("click",async ()=>{
    const symbol = stock.value.trim();
    const email = userEmailInput.value.trim();
    const frequency = frequencySelect.value;

    if(!symbol || !email || !email.includes("@")){
    if(!symbol) alert("enter a valid stock first!");
    if(!email || !email.includes("@")) alert("enter a valid email !");

    return;// return at any cost from here 
    }


    try{
        // coz we have to feed the data now to the server side , so that it can take the data from there using req.bodu 
        const response = await fetch("http://localhost:3000/api/subscribe",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                email:email,
                symbol:symbol,
                frequency:frequency
            }),
        });

        const result = await response.json();

        if(result.success){
            alert(`Successfully Subscribed !`);
        }else{
            alert(result.message || "failed to sub !");
        }

    }catch(err){
        console.error(err);
        alert("Server error , please try again later !");
    }
});

function showEmailSection(){
    const emailSection = document.getElementById("emailSection");
    if(emailSection){
        emailSection.classList.add("show");
    }

}



// const market = document.querySelector(".market");// then we have to just change the innerhtkl to smthg on clic of the div 

// const show = document.querySelector(".show");

const chartContainer= document.getElementById("chart");

const suggestionsContainer= document.querySelector(".suggestions");
// show.addEventListener("click",()=>{
//     const symbol  = document.querySelector(".stock").value;
//     if(!symbol) {
//         alert("please enter stock first ");
//         return ;
//     }
//     try{
//     loadChart(symbol);
//     }catch(err){
//         console.log(err);
//     }
// });

let currentChart = null;


stock.addEventListener("input",async()=>{
    
    const value = stock.value.trim();
    const main = document.querySelector(".suggestions");

    suggestionsContainer.innerHTML ="";
    // everytime someone will type , it will clear it
    if(value.length<2){
        return;
    }
    // why not pass this value somewhere as well , and get the list of answers from there, for each make a div and disply 
    try{
    const response = await fetch(`http://localhost:3000/search?q=${value}`);

    // this to be handled in the server side 

    const stocks = await response.json();
    // use await both the times 

    stocks.forEach(stock=>{
        const div = document.createElement("div");
        div.className="suggestion";

        div.innerHTML=`${stock.symbol} ${stock.name} ${stock.exchange}`;

        div.addEventListener("click",()=>{
            // const mainD = document.querySelector(".suggestions");
            const searchB= document.querySelector(".stock");
            searchB.value =stock.symbol;// given the name inside it 
            loadChart(stock.symbol);
            loadData(stock.symbol);
            showEmailSection();
            suggestionsContainer.innerHTML="";
        });
        suggestionsContainer.appendChild(div);// add those div there 
    });

    if(stocks.length>0){
        suggestionsContainer.classList.add("show");
    }

    }catch(err){
        console.log("Search error:",err);
    }

});

document.addEventListener("click", (e) => {
    if (!stockInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        suggestionsContainer.classList.remove("show");
    }
});


let selected = null;


async function loadData(symbol){
    try{
        const quoteResponse = await fetch(`http://localhost:3000/api/quote/${symbol}`);

        const quote = await quoteResponse.json();

        renderCard(quote);
        // get the json data from the backend first 
    }catch(err){
        console.log(err);
    }
}

function renderCard(quote){
    const marketCard = document.querySelector(".market");
    const color = quote.change>=0?"green":"red";
    marketCard.innerHTML= `
        <div class="card">
            <h2>${quote.symbol}</h2>

            <h1>₹${quote.price}</h1>

            <p style="color:${color}">
                ${quote.change.toFixed(2)}
                (${quote.changePercent.toFixed(2)}%)
            </p>

            <div class="stats">
                <span>Open: ${quote.open}</span>
                <span>High: ${quote.high}</span>
                <span>Low: ${quote.low}</span>
                <span>Prev Close: ${quote.previousClose}</span>
            </div>
        </div>
    `;

}



// here i can take the response from the user , i have to build a whole page that will first take the input from the user , and whenuser will ckick on it , we have to use the loadChart 
async function loadChart(symbol) {
    if(!symbol) return ;
    try{

        chartContainer.innerHTML="";
        if(currentChart){
            currentChart.remove();
            currentChart=null;
        }


    const response = await fetch(
        `http://localhost:3000/api/history/${symbol}`
    );

    const data = await response.json();

    currentChart = LightweightCharts.createChart(
        chartContainer,
        {
            width: 1600,
            height: 600,
            layout: { backgroundColor: '#ffffff' },
        }
    );

    const candleSeries =
        currentChart.addSeries(
            LightweightCharts.CandlestickSeries
        );

    candleSeries.setData(data);

    showEmailSection();// show the email from here as well 


    }catch(err){
        console.log(err);
        chartContainer.innerHTML = `<p style="color:red; padding:20px;">Error loading chart for ${symbol}</p>`;
    }
}

// loadChart();



// this is the type of json data that we have to read  create a handler for this as well 
// that will read this and send it to frontend , so that n8n can access it 


// [
//   {
//     "email": "akasshri245@gmail.com",
//     "stocks": [
//       {
//         "symbol": "TATACAP.NS",
//         "frequency": "hourly"
//       },
//       {
//         "symbol": "RELIANCE.NS",
//         "frequency": "2hourly"
//       }
//     ],
//     "subscribedAt": "2026-06-30T10:15:00.000Z"
//   }
// ]