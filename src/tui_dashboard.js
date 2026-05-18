import blessed from 'blessed';
import contrib from 'blessed-contrib';
import chalk from 'chalk';
import { fork } from 'child_process';
import path from 'path';

export class FuturisticTUI {
    constructor(rootDir = null) {
        this.rootDir = rootDir;
        this.serverProcess = null;
        this.currentLayout = 'default';
        
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

        // 0. ASCII Brand Header
        this.headerBox = this.grid.set(0, 0, 3, 12, blessed.box, {
            content: chalk.hex('#ffd700').bold(`
                              /\\^/\\
                             |::|::|
                            < ++|++ >
                           /=========\\
                          /+++++++++++\\
                         /=============\\
                      [ DATA NEXUS GEIST ]
            `),
            align: 'center',
            valign: 'middle',
            style: { fg: 'cyan', bg: 'transparent' }
        });

        // 1. Matrix Psychohistory (Line Chart)
        this.psychohistoryChart = this.grid.set(3, 0, 4, 8, contrib.line, {
            style: { line: "cyan", text: "green", baseline: "black" },
            xLabelPadding: 3, xPadding: 5, showLegend: true, wholeNumbersOnly: false,
            label: ' PSYCHOHISTORY PROJECTIONS (Cognitive Load) '
        });

        // 2. Omni-Channel Menu (List)
        this.menuList = this.grid.set(3, 8, 4, 4, blessed.list, {
            label: ' OMNI-CHANNEL MENU (Tab) ',
            keys: true, vi: true, mouse: true,
            style: { fg: 'cyan', border: { fg: 'cyan' }, selected: { bg: 'green', fg: 'black', bold: true } },
            items: ['1. System Status', '2. Restart Engine', '3. Visual: DataViz', '4. Shutdown Protocol']
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
                this.switchToLayout('dataviz');
            } else if (index === 3) {
                if (this.serverProcess) this.serverProcess.kill();
                process.exit(0);
            }
        });

        // 3. Dynamic Center Panel (Map / Bar Chart / Donut)
        // By default it's a map. In DataViz layout, it becomes a bar chart.
        this.dynamicPanel = this.grid.set(7, 0, 5, 4, contrib.map, {
            label: ' GLOBAL NODE SENSORS ',
            style: { shapeColor: 'cyan' }
        });

        // 4. Dialectical ReAct Logs (Log) - Scrollable
        this.logPanel = this.grid.set(7, 4, 5, 8, contrib.log, {
            fg: "green", selectedFg: "green", keys: true, vi: true, mouse: true, scrollable: true,
            label: ' GEIST VAULT - DIALECTICAL LOGS (Tab to scroll) '
        });
        focusable.push(this.logPanel);

        // 5. Interactive Terminal Input (Textbox) (Overlaid at bottom if needed, or mapped to keys)
        // We will capture global typing for direct commands if not focused on list/log
        this.inputBox = blessed.textbox({
            parent: this.screen,
            bottom: 0, left: 0, width: '100%', height: 1,
            keys: true, inputOnFocus: true,
            style: { fg: 'white', bg: 'blue' }
        });

        this.screen.key(['i', 'I', 'enter'], () => {
            if (this.screen.focused === this.menuList || this.screen.focused === this.logPanel) return;
            this.inputBox.focus();
            this.inputBox.readInput();
        });

        this.inputBox.on('submit', (value) => {
            this.inputBox.clearValue();
            if (value.trim() !== '') {
                this.logPanel.log(chalk.hex('#FFD700')(`[DIRECTIVE]: ${value}`));
                if (this.serverProcess) {
                    this.serverProcess.stdin.write(value + '\n');
                }
            }
            this.screen.render();
        });

        // Set initial focus
        focusIndex = 0; // menu list
        this.menuList.focus();

        this.simulateData();
        this.startServer();
        this.render();
    }

    switchToLayout(layout) {
        if (this.currentLayout === layout) return;
        this.currentLayout = layout;

        if (layout === 'dataviz') {
            // Procedural UI: Swap Map for Bar Chart
            this.screen.remove(this.dynamicPanel);
            this.dynamicPanel = this.grid.set(7, 0, 5, 4, contrib.bar, {
                label: ' DATA ANALYSIS (Procedural UI) ',
                barWidth: 4, barSpacing: 2, xOffset: 0, maxHeight: 9,
                style: { bg: 'black', fg: 'magenta' }
            });
            this.dynamicPanel.setData({ titles: ['T1', 'T2', 'T3'], data: [5, 10, 8] });
        } else if (layout === 'processing') {
            // Procedural UI: Swap Map for Donut/Progress
            this.screen.remove(this.dynamicPanel);
            this.dynamicPanel = this.grid.set(7, 0, 5, 4, contrib.donut, {
                label: ' NEURAL LOAD ',
                radius: 8, arcWidth: 3, remainColor: 'black', yPadding: 2
            });
            this.dynamicPanel.setData([
                {percent: 85, label: 'CPU', color: 'red'},
                {percent: 90, label: 'RAM', color: 'yellow'}
            ]);
            this.headerBox.style.fg = 'yellow'; // Pulse effect
        } else {
            // Default: Map
            this.screen.remove(this.dynamicPanel);
            this.dynamicPanel = this.grid.set(7, 0, 5, 4, contrib.map, {
                label: ' GLOBAL NODE SENSORS ',
                style: { shapeColor: 'cyan' }
            });
            this.dynamicPanel.addMarker({"lon" : "-79.0000", "lat" : "43.5000", color: "red", char: "X" }); 
            this.headerBox.style.fg = 'cyan';
        }
        this.screen.render();
    }

    startServer() {
        if (!this.rootDir) return;

        this.logPanel.log(chalk.cyan("Booting Gateway Engine..."));
        
        this.serverProcess = fork(path.join(this.rootDir, 'src', 'server.js'), [], {
            cwd: this.rootDir,
            env: { ...process.env, BABYLON_MODE: 'gateway' },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        this.serverProcess.on('message', (msg) => {
            if (msg.type === 'tui_layout') {
                this.switchToLayout(msg.layout);
            }
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
        
        setInterval(() => {
            series1.y.shift(); series1.y.push(Math.floor(Math.random() * 30));
            this.psychohistoryChart.setData([series1, series2]);
            
            if (this.currentLayout === 'processing' && this.dynamicPanel.setData) {
                 this.dynamicPanel.setData([
                    {percent: Math.floor(Math.random() * 20) + 70, label: 'CPU', color: 'red'},
                    {percent: Math.floor(Math.random() * 10) + 40, label: 'RAM', color: 'yellow'}
                 ]);
            } else if (this.currentLayout === 'dataviz' && this.dynamicPanel.setData) {
                 this.dynamicPanel.setData({ titles: ['T1', 'T2', 'T3'], data: [Math.floor(Math.random()*10), Math.floor(Math.random()*10), Math.floor(Math.random()*10)] });
            }

            this.screen.render();
        }, 1500);
    }

    render() {
        this.screen.render();
    }
}

export const startTUI = () => new FuturisticTUI();
export const startGatewayTUI = (rootDir) => new FuturisticTUI(rootDir);
