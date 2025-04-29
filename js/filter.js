// 🎚️ Crea filtros y filtra los datos
function getUniqueFilterValues(data, key) {
    const values = new Set();
    data.forEach(item => {
        if (item[key]) values.add(item[key]);
    });
    return [...values];
}

function createFilterControl(values, key, callback) {
    const container = document.getElementById("mapa-v3");
    const select = document.createElement("select");
    select.innerHTML = `<option value="">Todos los ${key}</option>` +
        values.map(val => `<option value="${val}">${val}</option>`).join("");
    select.onchange = () => callback(select.value);
    container.parentNode.insertBefore(select, container);
}

function applyFilter(data, key, value) {
    if (!value) return data;
    return data.filter(item => item[key] === value);
}
