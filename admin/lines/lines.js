(function () {
    'use strict';

    const DATA_URL = '../../data/railway.json';
    const SET_KEY = 'rail'; // railway.json → sets.rail.lines holds the train lines
    let railData = null;
    let editing = null; // id string, or 'new'

    const statusEl = document.getElementById('status-msg');
    const rowsEl = document.getElementById('poi-rows');
    const searchBox = document.getElementById('search-box');
    const formContainer = document.getElementById('form-container');

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getLines() {
        if (!railData || !railData.sets || !railData.sets[SET_KEY]) return {};
        const lines = railData.sets[SET_KEY].lines;
        return (lines && !Array.isArray(lines)) ? lines : {};
    }

    function ensureSetShape() {
        if (!railData.sets) railData.sets = {};
        if (!railData.sets[SET_KEY]) {
            railData.sets[SET_KEY] = { hide: false, circles: {}, areas: {}, label: 'Railways', markers: {}, lines: {}, layerprio: 1 };
        }
        if (!railData.sets[SET_KEY].lines || Array.isArray(railData.sets[SET_KEY].lines)) {
            railData.sets[SET_KEY].lines = {};
        }
    }

    function loadData() {
        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                railData = json;
                ensureSetShape();
                statusEl.textContent = 'Once you finished edting. Download railway.json and upload it the github repo.';
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
        label.innerHTML = 'Load a local railway.json instead: ';
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function () {
                try {
                    railData = JSON.parse(reader.result);
                    ensureSetShape();
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

    function pointsToText(points) {
        return (points || []).map(function (p) { return p[0] + ',' + p[1]; }).join('\n');
    }

    function textToPoints(text) {
        return text.split('\n')
            .map(function (line) { return line.trim(); })
            .filter(Boolean)
            .map(function (line) {
                const parts = line.split(',').map(function (s) { return Number(s.trim()); });
                return [parts[0] || 0, parts[1] || 0];
            });
    }

    function matchesSearch(label, term) {
        if (!term) return true;
        return (label || '').toLowerCase().includes(term.toLowerCase());
    }

    function renderRows() {
        const term = searchBox.value.trim();
        const lines = getLines();
        rowsEl.innerHTML = '';
        Object.keys(lines).forEach(function (id) {
            const line = lines[id];
            if (!matchesSearch(line.label, term)) return;
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + escapeHtml(line.label) + '</td>' +
                '<td><span class="swatch" style="background:' + escapeHtml(line.color || '#ffffff') + '"></span>' + escapeHtml(line.color) + '</td>' +
                '<td>' + escapeHtml(line.weight) + ' / ' + escapeHtml(line.opacity) + '</td>' +
                '<td>' + (line.points ? line.points.length : 0) + ' points</td>' +
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
                if (!confirm('Delete this rail line? This cannot be undone (until you re-download the original file).')) return;
                delete railData.sets[SET_KEY].lines[id];
                renderRows();
            });
        });
    }

    function openForm(id) {
        editing = id || 'new';
        const line = id ? getLines()[id] : { label: '', color: '#0000ff', weight: 3, opacity: 0.8, points: [] };

        formContainer.innerHTML =
            '<div class="poi-form">' +
            '<label>Line name <input id="f-label" type="text" value="' + escapeHtml(line.label) + '"></label>' +
            '<label>Color <input id="f-color" type="text" value="' + escapeHtml(line.color || '#0000ff') + '"></label>' +
            '<label>Weight <input id="f-weight" type="text" value="' + escapeHtml(line.weight != null ? line.weight : 3) + '"></label>' +
            '<label>Opacity <input id="f-opacity" type="text" value="' + escapeHtml(line.opacity != null ? line.opacity : 0.8) + '"></label>' +
            '<label>Points, one "x,z" per line <textarea id="f-points">' + escapeHtml(pointsToText(line.points)) + '</textarea></label>' +
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
        const lines = getLines();
        let max = 0;
        Object.keys(lines).forEach(function (k) {
            const n = parseInt(k, 10);
            if (!isNaN(n) && n > max) max = n;
        });
        return String(max + 1);
    }

    function saveForm() {
        const line = {
            label: document.getElementById('f-label').value.trim(),
            color: document.getElementById('f-color').value.trim() || '#0000ff',
            weight: Number(document.getElementById('f-weight').value) || 3,
            opacity: Number(document.getElementById('f-opacity').value) || 0.8,
            markup: false,
            points: textToPoints(document.getElementById('f-points').value)
        };

        const id = editing === 'new' ? nextId() : editing;
        railData.sets[SET_KEY].lines[id] = line;

        editing = null;
        formContainer.innerHTML = '';
        renderRows();
    }

    function downloadJson() {
        if (!railData) return;
        const blob = new Blob([JSON.stringify(railData, null, 4)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'railway.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    document.getElementById('add-new-btn').addEventListener('click', function () { openForm(null); });
    document.getElementById('download-btn').addEventListener('click', downloadJson);
    searchBox.addEventListener('input', renderRows);

    loadData();
})();
