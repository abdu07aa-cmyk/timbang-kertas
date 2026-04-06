fetch('data.json')
.then(res => res.json())
.then(data => {

let grouped={};

data.forEach((item,i)=>{
if(!grouped[item.po]) grouped[item.po]=[];
item.id=i
grouped[item.po].push(item)
})

render()

function render(){

let html=""

for(let po in grouped){

html+=`<h3>PO : ${po}</h3>
<table>
<tr>
<th>Jenis</th>
<th>Order</th>
<th>Masuk</th>
<th>Kirim</th>
<th>Sisa</th>
<th>Status</th>
</tr>`

grouped[po].forEach(d=>{

let sisa=d.order-d.kirim
if(sisa<0) sisa=0

let status="PROSES"

if(d.kirim==0) status="BELUM KIRIM"
else if(d.kirim<d.order) status="PROSES"
else if(d.kirim==d.order) status="SELESAI"
else if(d.kirim>d.order) status="STOCK LEBIH"

html+=`
<tr>
<td>${d.jenis}</td>
<td>${d.order}</td>

<td>
<input type="number" value="${d.masuk}" 
onchange="updateMasuk(${d.id},this.value)">
</td>

<td>
<input type="number" value="${d.kirim}" 
onchange="updateKirim(${d.id},this.value)">
</td>

<td>${sisa}</td>
<td>${status}</td>

</tr>`
})

html+="</table>"
}

document.getElementById("poList").innerHTML=html

}

window.updateMasuk=function(id,val){
data[id].masuk=parseInt(val)||0
render()
}

window.updateKirim=function(id,val){
data[id].kirim=parseInt(val)||0
render()
}

})
