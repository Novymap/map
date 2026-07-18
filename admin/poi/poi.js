(function () {
    'use strict';

    const DATA_URL = '../../data/marker_world.json';
    const TYPE_OPTIONS = ['build', 'farm', 'shop', 'other', 'station', 'wxt', 'dial', 'pvp'];
    let markerData = null;
    let editing = null; // id string, or 'new'

    const statusEl = document.getElementById('status-msg');
    const rowsEl = document.getElementById('poi-rows');
    const searchBox = document.getElementById('search-box');
    const formContainer = document.getElementById('form-container');

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getMarkers() {
        return (markerData && markerData.markers) ? markerData.markers : {};
    }

    function loadData() {
        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                markerData = json;
                if (!markerData.markers) markerData.markers = {};
                statusEl.textContent = "Once you've finished editing. Download marker_world.json and upload it to the github repo.";
                renderRows();
            })
            .catch(function (err) {
                statusEl.textContent = 'Failed to load ' + DATA_URL + ' (' + err.message + '). ' +
                    'If you are opening this file directly (file://), run it through a local web server instead, ' +
                    'or use the file picker below.';
                addFilePicker();
            });
    }

    function addFilePicker() {
        const label = document.createElement('label');
        label.style.cssText = 'display:block;margin:8px 0;font-size:13px;';
        label.innerHTML = 'Load a local marker_world.json instead: ';
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function () {
                try {
                    markerData = JSON.parse(reader.result);
                    if (!markerData.markers) markerData.markers = {};
                    statusEl.textContent = 'Loaded ' + file.name + ' from disk.';
                    renderRows();
                } catch (e) {
                    statusEl.textContent = 'Could not parse that file as JSON.';
                }
            };
            reader.readAsText(file);
        });
        label.appendChild(input);
        formContainer.appendChild(label);
    }

    function matchesSearch(m, term) {
        if (!term) return true;
        term = term.toLowerCase();
        return (m.type || '').toLowerCase().includes(term) ||
            (m.label || '').toLowerCase().includes(term) ||
            (m.dial || '').toLowerCase().includes(term) ||
            (m.info || '').toLowerCase().includes(term);
    }

    function renderRows() {
        const term = searchBox.value.trim();
        const markers = getMarkers();
        rowsEl.innerHTML = '';
        Object.keys(markers).forEach(function (id) {
            const m = markers[id];
            if (!matchesSearch(m, term)) return;
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + escapeHtml(m.type || 'other') + '</td>' +
                '<td>' + escapeHtml(m.label) + '</td>' +
                '<td>' + escapeHtml(m.dial) + '</td>' +
                '<td>' + escapeHtml(m.x) + '</td>' +
                '<td>' + escapeHtml(m.y) + '</td>' +
                '<td>' + escapeHtml(m.z) + '</td>' +
                '<td>' + escapeHtml(m.icon) + '</td>' +
                '<td style="white-space:nowrap;">' +
                '<button class="btn btn-edit" data-id="' + id + '">Edit</button> ' +
                '<button class="btn btn-delete" data-id="' + id + '">Delete</button>' +
                '</td>';
            rowsEl.appendChild(tr);
        });

        rowsEl.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () { openForm(btn.getAttribute('data-id')); });
        });
        rowsEl.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                if (!confirm('Delete this POI? This cannot be undone (until you re-download the original file).')) return;
                delete markerData.markers[id];
                renderRows();
            });
        });
    }

    function getTypeOptions(selected) {
        return TYPE_OPTIONS.map(function (t) {
            const sel = t === selected ? ' selected' : '';
            return '<option value="' + t + '"' + sel + '>' + t + '</option>';
        }).join('');
    }

    function openForm(id) {
        editing = id || 'new';
        const m = id ? getMarkers()[id] : {
            label: '', x: '', y: '64', z: '', icon: 'building', info: '', dial: '', wiki: '', type: 'build'
        };

        formContainer.innerHTML =
            '<div class="poi-form">' +
            '<label>Marker type <select id="f-type">' + getTypeOptions(m.type || 'build') + '</select></label>' +
            '<label>Label <input id="f-label" type="text" value="' + escapeHtml(m.label) + '"></label>' +
            '<label>Info <input id="f-info" type="text" value="' + escapeHtml(m.info) + '"></label>' +
            '<label>X <input id="f-x" type="text" value="' + escapeHtml(m.x) + '"></label>' +
            '<label>Y <input id="f-y" type="text" value="' + escapeHtml(m.y || '64') + '"></label>' +
            '<label>Z <input id="f-z" type="text" value="' + escapeHtml(m.z) + '"></label>' +
            '<label>Icon <input id="f-icon" type="text" value="' + escapeHtml(m.icon || 'building') + '"></label>' +
            '<label>Dial (no /dial) <input id="f-dial" type="text" value="' + escapeHtml(m.dial) + '"></label>' +
            '<label>Wiki URL <input id="f-wiki" type="text" value="' + escapeHtml(m.wiki) + '"></label>' +
            '<div class="poi-form-actions">' +
            '<button class="btn btn-save" id="f-save">Save</button>' +
            '<button class="btn btn-cancel" id="f-cancel">Cancel</button>' +
            '</div></div>';

        document.getElementById('f-save').addEventListener('click', saveForm);
        document.getElementById('f-cancel').addEventListener('click', function () {
            editing = null;
            formContainer.innerHTML = '';
        });
    }

    function nextId() {
        const markers = getMarkers();
        let max = 0;
        Object.keys(markers).forEach(function (k) {
            const n = parseInt(k, 10);
            if (!isNaN(n) && n > max) max = n;
        });
        return String(max + 1);
    }

    function saveForm() {
        const entry = {
            type: document.getElementById('f-type').value,
            label: document.getElementById('f-label').value.trim(),
            info: document.getElementById('f-info').value.trim(),
            x: document.getElementById('f-x').value.trim(),
            y: document.getElementById('f-y').value.trim(),
            z: document.getElementById('f-z').value.trim(),
            icon: document.getElementById('f-icon').value.trim() || 'building',
            dial: document.getElementById('f-dial').value.trim(),
            wiki: document.getElementById('f-wiki').value.trim()
        };
        if (!entry.wiki) delete entry.wiki;

        const id = editing === 'new' ? nextId() : editing;
        markerData.markers[id] = entry;

        editing = null;
        formContainer.innerHTML = '';
        renderRows();
    }

    function downloadJson() {
        if (!markerData) return;
        const blob = new Blob([JSON.stringify(markerData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'marker_world.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    document.getElementById('add-new-btn').addEventListener('click', function () { openForm(null); });
    document.getElementById('download-btn').addEventListener('click', downloadJson);
    searchBox.addEventListener('input', renderRows);

    loadData();
})();
