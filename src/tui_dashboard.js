import blessed from 'blessed';
import contrib from 'blessed-contrib';
import chalk from 'chalk';
import { fork } from 'child_process';
import path from 'path';

export class FuturisticTUI {
    constructor(rootDir = null) {
        this.rootDir = rootDir;
        this.serverProcess = null;
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'BABYLON.IA - PRIME RADIANT (Asimov Foundation)',
            fullUnicode: true,
            cursor: { artificial: true, shape: 'block', blink: true, color: null }
        });

        // Manejar salida
        this.screen.key(['escape', 'C-c'], (ch, key) => {
            if (this.serverProcess) this.serverProcess.kill();
            return process.exit(0);
        });

        // Atajos para mover el foco
        const focusable = [];
        let focusIndex = 0;

        this.screen.key(['tab'], (ch, key) => {
            focusIndex = (focusIndex + 1) % focusable.length;
            focusable[focusIndex].focus();
            this.screen.render();
        });

        this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

        // 1. Matrix Psychohistory (Line Chart)
        this.psychohistoryChart = this.grid.set(0, 0, 4, 8, contrib.line, {
            style: { line: "cyan", text: "green", baseline: "black" },
            xLabelPadding: 3, xPadding: 5, showLegend: true, wholeNumbersOnly: false,
            label: ' PSYCHOHISTORY PROJECTIONS (Cognitive Load) '
        });

        // 2. Omni-Channel Menu (List)
        this.menuList = this.grid.set(4, 0, 4, 4, blessed.list, {
            label: ' OMNI-CHANNEL MENU (Tab to focus, Enter to select) ',
            keys: true, vi: true, mouse: true,
            style: { fg: 'cyan', border: { fg: 'cyan' }, selected: { bg: 'green', fg: 'black', bold: true } },
            items: ['1. System Status', '2. Restart Gateway Engine', '3. Clear Logs', '4. Shutdown Protocol (Exit)']
        });
        focusable.push(this.menuList);

        this.menuList.on('select', (item, index) => {
            if (index === 0) {
                this.logPanel.log(chalk.yellow('[System] BABYLON.IA Omni-Channel Gateway Active. Hermes Broker operational.'));
            } else if (index === 1) {
                this.logPanel.log(chalk.red('[System] Restarting Gateway Engine...'));
                if (this.serverProcess) this.serverProcess.kill();
                setTimeout(() => this.startServer(), 1000);
            } else if (index === 2) {
                // Not perfectly supported by contrib.log, but we can send clear lines
                for(let i=0; i<50; i++) this.logPanel.log(' ');
            } else if (index === 3) {
                if (this.serverProcess) this.serverProcess.kill();
                process.exit(0);
            }
        });

        // 3. Active Nodes Map
        this.map = this.grid.set(4, 4, 4, 4, contrib.map, {
            label: ' GLOBAL NODE SENSORS ',
            style: { shapeColor: 'cyan' }
        });

        // 4. Dialectical ReAct Logs (Log) - Scrollable
        this.logPanel = this.grid.set(8, 0, 4, 8, contrib.log, {
            fg: "green", selectedFg: "green", keys: true, vi: true, mouse: true, scrollable: true,
            label: ' GEIST VAULT - DIALECTICAL LOGS (Tab to scroll) '
        });
        focusable.push(this.logPanel);

        // 5. System Status & CPU/RAM (Donut)
        this.systemDonut = this.grid.set(0, 8, 4, 4, contrib.donut, {
            label: ' CORE RESONANCE ',
            radius: 8, arcWidth: 3, remainColor: 'black', yPadding: 2
        });

        // 6. Active Sub-agents (Table)
        this.agentsTable = this.grid.set(4, 8, 4, 4, contrib.table, {
            keys: true, fg: 'white', selectedFg: 'white', selectedBg: 'blue', interactive: false,
            label: ' ACTIVE CHANNELS ',
            columnSpacing: 2, columnWidth: [12, 10, 10]
        });

        // 7. Interactive Terminal Input (Textbox)
        this.inputBox = this.grid.set(8, 8, 4, 4, blessed.textbox, {
            label: ' DIRECTIVE INPUT (Tab to focus) ',
            keys: true, inputOnFocus: true, border: { type: "line", fg: "cyan" },
            style: { fg: 'white', focus: { border: { fg: 'yellow' } } }
        });
        focusable.push(this.inputBox);

        this.inputBox.on('submit', (value) => {
            this.inputBox.clearValue();
            this.logPanel.log(chalk.hex('#FFD700')(`[DIRECTIVE]: ${value}`));
            if (this.serverProcess) {
                // Send standard input to the server process for the TUI handling
                this.serverProcess.stdin.write(value + '\n');
            }
            this.inputBox.focus();
            this.screen.render();
        });

        // Set initial focus
        focusIndex = 2; // Input box
        this.inputBox.focus();

        this.simulateData();
        this.startServer();
        this.render();
    }

    startServer() {
        if (!this.rootDir) return;

        this.logPanel.log(chalk.cyan("Booting Gateway Engine..."));
        
        this.serverProcess = fork(path.join(this.rootDir, 'src', 'server.js'), [], {
            cwd: this.rootDir,
            env: { ...process.env, BABYLON_MODE: 'gateway' },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        this.serverProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if(line.trim()) this.logPanel.log(line);
            });
        });

        this.serverProcess.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if(line.trim()) this.logPanel.log(chalk.red(line));
            });
        });

        this.serverProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                this.logPanel.log(chalk.red(`[CRITICAL] Gateway Engine Offline. Code: ${code}`));
            }
        });
    }

    simulateData() {
        const series1 = { title: 'Trantor Variance', x: ['t-5', 't-4', 't-3', 't-2', 't-1', 't0'], y: [5, 10, 15, 8, 12, 20] };
        const series2 = { title: 'Terminus Stability', x: ['t-5', 't-4', 't-3', 't-2', 't-1', 't0'], y: [90, 85, 88, 92, 95, 96], style: { line: 'yellow' } };
        this.psychohistoryChart.setData([series1, series2]);

        this.map.addMarker({"lon" : "-79.0000", "lat" : "43.5000", color: "red", char: "X" }); 
        this.map.addMarker({"lon" : "2.3522", "lat" : "48.8566", color: "yellow", char: "O" });

        this.agentsTable.setData({
            headers: ['Channel', 'Type', 'Status'],
            data: [
                ['WhatsApp', 'Gateway', chalk.green('ONLINE')],
                ['Web Dash', 'Socket', chalk.green('ACTIVE')],
                ['Discord', 'Bot', chalk.yellow('SYNCING')],
                ['WeChat', 'Puppet', chalk.gray('IDLE')]
            ]
        });

        setInterval(() => {
            series1.y.shift(); series1.y.push(Math.floor(Math.random() * 30));
            this.psychohistoryChart.setData([series1, series2]);
            this.systemDonut.setData([
                {percent: Math.floor(Math.random() * 20) + 70, label: 'CPU', color: 'green'},
                {percent: Math.floor(Math.random() * 10) + 40, label: 'RAM', color: 'cyan'}
            ]);
            this.screen.render();
        }, 2000);
    }

    render() {
        this.screen.render();
    }
}

export const startTUI = () => new FuturisticTUI();
export const startGatewayTUI = (rootDir) => new FuturisticTUI(rootDir);
