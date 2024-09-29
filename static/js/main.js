document.addEventListener('DOMContentLoaded', function() {
    const taskForms = document.querySelectorAll('.task-form');
    const taskLists = document.querySelectorAll('.task-list');
    const timeframeSelect = document.getElementById('timeframe-select');
    const exportBtn = document.getElementById('export-btn');
    const progressChartContainer = document.querySelector('.chart-container');
    const progressChart = document.getElementById('progress-chart');
    let chart;

    console.log('DOM fully loaded');

    if (!progressChartContainer) {
        console.error('Progress chart container not found. Please check the HTML for an element with class "chart-container"');
    } else {
        console.log('Progress chart container found');
    }

    if (!progressChart) {
        console.error('Progress chart canvas not found. Please check the HTML for a canvas element with id "progress-chart"');
    } else {
        console.log('Progress chart canvas found');
    }

    fetchTasks();
    updateProgress();

    taskForms.forEach(form => {
        form.addEventListener('submit', addTask);
    });

    timeframeSelect.addEventListener('change', updateProgress);

    if (exportBtn) {
        console.log('Export button found');
        exportBtn.addEventListener('click', exportData);
    } else {
        console.error('Export button not found');
    }

    function addTaskEventListeners() {
        document.querySelectorAll('.toggle-task').forEach(btn => {
            btn.addEventListener('click', toggleTask);
        });
        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', deleteTask);
        });
    }

    function fetchTasks() {
        console.log('Fetching tasks...');
        fetch('/tasks')
            .then(response => response.json())
            .then(tasks => {
                console.log('Tasks fetched:', tasks);
                const gTasks = tasks.filter(task => task.user_id === 1);
                const aTasks = tasks.filter(task => task.user_id === 2);
                renderTasks(gTasks, taskLists[0]);
                renderTasks(aTasks, taskLists[1]);
                updateProgress();
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
                displayErrorMessage('Failed to fetch tasks. Please try refreshing the page.');
            });
    }

    function renderTasks(tasks, taskList) {
        console.log('Rendering tasks for list:', taskList);
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <span class="task-content ${task.completed ? 'task-completed' : ''}">${task.content}</span>
                <button class="btn btn-primary toggle-task" data-id="${task.id}">${task.completed ? 'Undo' : 'Complete'}</button>
                <button class="btn btn-danger delete-task" data-id="${task.id}">Delete</button>
            `;
            taskList.appendChild(li);
        });
        addTaskEventListeners();
    }

    function addTask(e) {
        e.preventDefault();
        const form = e.target;
        const input = form.querySelector('input[type="text"]');
        const userId = form.dataset.userId;

        fetch('/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: input.value,
                user_id: userId
            }),
        })
        .then(response => response.json())
        .then(newTask => {
            const taskList = form.nextElementSibling;
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <span class="task-content">${newTask.content}</span>
                <button class="btn btn-primary toggle-task" data-id="${newTask.id}">Complete</button>
                <button class="btn btn-danger delete-task" data-id="${newTask.id}">Delete</button>
            `;
            taskList.appendChild(li);
            input.value = '';
            addTaskEventListeners();
            updateProgress();
        })
        .catch(error => {
            console.error('Error adding task:', error);
            displayErrorMessage('Failed to add task. Please try again.');
        });
    }

    function toggleTask(e) {
        const taskId = e.target.dataset.id;
        const taskContent = e.target.previousElementSibling;
        const completed = !taskContent.classList.contains('task-completed');

        fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed }),
        })
        .then(response => response.json())
        .then(updatedTask => {
            taskContent.classList.toggle('task-completed');
            e.target.textContent = completed ? 'Undo' : 'Complete';
            updateProgress();
        })
        .catch(error => {
            console.error('Error toggling task:', error);
            displayErrorMessage('Failed to update task. Please try again.');
        });
    }

    function deleteTask(e) {
        const taskId = e.target.dataset.id;
        fetch(`/tasks/${taskId}`, {
            method: 'DELETE',
        })
        .then(() => {
            e.target.closest('.task-item').remove();
            updateProgress();
        })
        .catch(error => {
            console.error('Error deleting task:', error);
            displayErrorMessage('Failed to delete task. Please try again.');
        });
    }

    function initChart(labels, gData, aData) {
        console.log('Initializing chart');
        console.log('Labels:', labels);
        console.log('G Data:', gData);
        console.log('A Data:', aData);

        if (!progressChart) {
            console.error('Progress chart canvas not found');
            return null;
        }

        if (chart) {
            chart.destroy();
        }

        if (!Array.isArray(gData) || !Array.isArray(aData)) {
            console.error('Invalid data format. Expected arrays for gData and aData.');
            return null;
        }

        const filteredGData = gData.filter(point => point !== null);
        const filteredAData = aData.filter(point => point !== null);

        console.log('Filtered G Data:', filteredGData);
        console.log('Filtered A Data:', filteredAData);

        try {
            chart = new Chart(progressChart, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'G\'s Progress',
                            data: filteredGData,
                            borderColor: 'rgba(72, 187, 120, 1)',
                            backgroundColor: 'rgba(72, 187, 120, 0.2)',
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            tension: 0.1
                        },
                        {
                            label: 'A\'s Progress',
                            data: filteredAData,
                            borderColor: 'rgba(66, 153, 225, 1)',
                            backgroundColor: 'rgba(66, 153, 225, 0.2)',
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                displayFormats: {
                                    day: 'MMM d'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            ticks: {
                                source: 'labels'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Completion Percentage'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                                }
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
            console.log('Chart initialized successfully');
            return chart;
        } catch (error) {
            console.error('Error initializing chart:', error);
            return null;
        }
    }

    function updateProgress() {
        console.log('updateProgress function called');
        const timeframe = timeframeSelect.value;
        fetch(`/progress?timeframe=${timeframe}`)
            .then(response => {
                console.log('Progress response received');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Progress data received:', data);

                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid data received');
                }

                const gProgress = data['G'] || [];
                const aProgress = data['A'] || [];

                console.log('G Progress:', gProgress);
                console.log('A Progress:', aProgress);

                if (gProgress.length === 0 && aProgress.length === 0) {
                    console.log('No progress data available');
                    displayNoDataMessage();
                    return;
                }

                const startDate = new Date();
                startDate.setDate(startDate.getDate() - parseInt(timeframe));
                const endDate = new Date();

                const labels = [];
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    labels.push(new Date(d));
                }

                console.log('Labels:', labels);

                const gData = labels.map(date => {
                    const progress = gProgress.find(p => new Date(p.date).toDateString() === date.toDateString());
                    return progress ? { x: date, y: progress.completion_percentage } : { x: date, y: null };
                });

                const aData = labels.map(date => {
                    const progress = aProgress.find(p => new Date(p.date).toDateString() === date.toDateString());
                    return progress ? { x: date, y: progress.completion_percentage } : { x: date, y: null };
                });

                console.log('Processed G Data:', gData);
                console.log('Processed A Data:', aData);

                try {
                    chart = initChart(labels, gData, aData);

                    if (!chart) {
                        throw new Error('Failed to initialize chart');
                    }

                    console.log('Chart initialized:', chart);

                    const latestGProgress = gProgress[gProgress.length - 1] || { completion_percentage: 0, completed_tasks: 0, total_tasks: 0 };
                    const latestAProgress = aProgress[aProgress.length - 1] || { completion_percentage: 0, completed_tasks: 0, total_tasks: 0 };

                    const gProgressElement = document.getElementById('g-progress');
                    const aProgressElement = document.getElementById('a-progress');

                    if (gProgressElement && aProgressElement) {
                        gProgressElement.textContent = `${latestGProgress.completion_percentage.toFixed(2)}% (${latestGProgress.completed_tasks}/${latestGProgress.total_tasks})`;
                        aProgressElement.textContent = `${latestAProgress.completion_percentage.toFixed(2)}% (${latestAProgress.completed_tasks}/${latestAProgress.total_tasks})`;
                        console.log('Progress text updated');
                    } else {
                        console.error('Progress elements not found');
                    }

                    if (progressChartContainer) {
                        progressChartContainer.style.display = 'block';
                        console.log('Chart container display set to block');
                        progressChartContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        console.log('Scrolled to chart container');
                    } else {
                        console.error('Progress chart container not found');
                    }
                } catch (error) {
                    console.error('Error during chart initialization:', error);
                    displayErrorMessage('Failed to initialize chart. Please try again later.');
                }
            })
            .catch(error => {
                console.error('Error fetching or processing progress data:', error);
                displayErrorMessage('Failed to load progress data. Please try again later.');
            });
    }

    function displayErrorMessage(message) {
        console.error('Displaying error message:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        if (progressChartContainer) {
            progressChartContainer.innerHTML = '';
            progressChartContainer.appendChild(errorDiv);
            progressChartContainer.style.display = 'block';
        } else {
            console.error('Progress chart container not found');
            document.body.appendChild(errorDiv);
        }
    }

    function displayNoDataMessage() {
        console.log('Displaying no data message');
        const noDataDiv = document.createElement('div');
        noDataDiv.className = 'no-data-message';
        noDataDiv.textContent = 'No progress data available for the selected timeframe.';
        if (progressChartContainer) {
            progressChartContainer.innerHTML = '';
            progressChartContainer.appendChild(noDataDiv);
            progressChartContainer.style.display = 'block';
        } else {
            console.error('Progress chart container not found');
            document.body.appendChild(noDataDiv);
        }
    }

    function exportData() {
        console.log('Export function called');
        const timeframe = timeframeSelect.value;
        console.log('Selected timeframe:', timeframe);
        fetch(`/export?timeframe=${timeframe}`)
            .then(response => {
                console.log('Export response received');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Export data received:', data);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `daily_quest_export_${timeframe}days.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('Export completed');
            })
            .catch(error => {
                console.error('Export error:', error);
                displayErrorMessage('Failed to export data. Please try again later.');
            });
    }
});
