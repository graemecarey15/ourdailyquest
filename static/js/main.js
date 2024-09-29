document.addEventListener('DOMContentLoaded', function() {
    const taskForms = document.querySelectorAll('.task-form');
    const taskLists = document.querySelectorAll('.task-list');
    const timeframeSelect = document.getElementById('timeframe-select');
    const exportBtn = document.getElementById('export-btn');
    let chart;

    console.log('DOM fully loaded');

    // Fetch tasks after DOM is loaded
    fetchTasks();
    initChart();
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
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
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
        });
    }

    function initChart() {
        const ctx = document.getElementById('progress-chart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'G\'s Progress',
                        data: [],
                        borderColor: 'rgba(72, 187, 120, 1)',
                        backgroundColor: 'rgba(72, 187, 120, 0.2)',
                        tension: 0.1
                    },
                    {
                        label: 'A\'s Progress',
                        data: [],
                        borderColor: 'rgba(66, 153, 225, 1)',
                        backgroundColor: 'rgba(66, 153, 225, 0.2)',
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
                            unit: 'day'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
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
                    }
                }
            }
        });
    }

    function updateProgress() {
        const timeframe = timeframeSelect.value;
        fetch(`/progress?timeframe=${timeframe}`)
            .then(response => response.json())
            .then(data => {
                const gProgress = data['G'] || [];
                const aProgress = data['A'] || [];

                const labels = [...new Set([...gProgress.map(p => p.date), ...aProgress.map(p => p.date)])].sort();

                chart.data.labels = labels;
                chart.data.datasets[0].data = labels.map(date => {
                    const progress = gProgress.find(p => p.date === date);
                    return progress ? progress.completion_percentage : null;
                });
                chart.data.datasets[1].data = labels.map(date => {
                    const progress = aProgress.find(p => p.date === date);
                    return progress ? progress.completion_percentage : null;
                });

                chart.options.scales.x.time.unit = timeframe <= 7 ? 'day' : 'week';
                chart.update();

                // Update progress text
                const latestGProgress = gProgress[gProgress.length - 1] || { completion_percentage: 0, completed_tasks: 0, total_tasks: 0 };
                const latestAProgress = aProgress[aProgress.length - 1] || { completion_percentage: 0, completed_tasks: 0, total_tasks: 0 };

                document.getElementById('g-progress').textContent = `${latestGProgress.completion_percentage.toFixed(2)}% (${latestGProgress.completed_tasks}/${latestGProgress.total_tasks})`;
                document.getElementById('a-progress').textContent = `${latestAProgress.completion_percentage.toFixed(2)}% (${latestAProgress.completed_tasks}/${latestAProgress.total_tasks})`;
            });
    }

    function exportData() {
        console.log('Export function called');
        const timeframe = timeframeSelect.value;
        console.log('Selected timeframe:', timeframe);
        fetch(`/export?timeframe=${timeframe}`)
            .then(response => {
                console.log('Export response received');
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
            });
    }
});
