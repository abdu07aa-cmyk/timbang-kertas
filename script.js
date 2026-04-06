fetch('data.json')
.then(res => res.json())
.then(data => {

let grouped = {};

data.forEach(item=>{
if(!grouped[item.po]) grouped[item.po]=[];
grouped[item.po].push(item);
});

let html="";

for(let po in grouped){

html+=`<h3>PO : ${po}</h3>
<table>
<tr>
<th>Jenis</th>
<th>Size</th>
<th>Order</th>
</tr>`;

grouped[po].forEach(d=>{
html+=`<tr>
<td>${d.jenis}</td>
<td>${d.size}</td>
<td>${d.order}</td>
</tr>`;
});

html+="</table>";
}

document.getElementById("poList").innerHTML=html;

});
