from flask import jsonify, request, render_template
from app import app, db
from models import User, Task
from sqlalchemy import func
import json
from datetime import datetime, timedelta

@app.route('/')
def index():
    current_date = datetime.now().strftime("%A, %B %d, %Y")
    return render_template('index.html', current_date=current_date)

@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'content': task.content,
        'completed': task.completed,
        'user_id': task.user_id,
        'date_created': task.date_created.isoformat()
    } for task in tasks])

@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    new_task = Task(content=data['content'], user_id=data['user_id'])
    db.session.add(new_task)
    db.session.commit()
    return jsonify({
        'id': new_task.id,
        'content': new_task.content,
        'completed': new_task.completed,
        'user_id': new_task.user_id,
        'date_created': new_task.date_created.isoformat()
    }), 201

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.json
    task.completed = data['completed']
    db.session.commit()
    return jsonify({
        'id': task.id,
        'content': task.content,
        'completed': task.completed,
        'user_id': task.user_id,
        'date_created': task.date_created.isoformat()
    })

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return '', 204

@app.route('/progress', methods=['GET'])
def get_progress():
    try:
        timeframe = request.args.get('timeframe', '30')
        timeframe = int(timeframe)
        
        start_date = datetime.utcnow().date() - timedelta(days=timeframe)
        
        daily_progress = db.session.query(
            User.name,
            func.date(Task.date_created).label('date'),
            func.count(Task.id).label('total_tasks'),
            func.sum(Task.completed.cast(db.Integer)).label('completed_tasks')
        ).join(Task).filter(
            func.date(Task.date_created) >= start_date
        ).group_by(User.name, func.date(Task.date_created)).all()
        
        progress_data = {}
        for p in daily_progress:
            if p.name not in progress_data:
                progress_data[p.name] = []
            
            completion_percentage = round((p.completed_tasks / p.total_tasks) * 100, 2) if p.total_tasks > 0 else 0
            progress_data[p.name].append({
                'date': p.date.isoformat(),
                'total_tasks': p.total_tasks,
                'completed_tasks': p.completed_tasks,
                'completion_percentage': completion_percentage
            })
        
        # If no data is available, return an empty object for each user
        if not progress_data:
            progress_data = {'G': [], 'A': []}
        
        app.logger.info(f"Progress data: {json.dumps(progress_data)}")
        return jsonify(progress_data)
    except Exception as e:
        app.logger.error(f"Error in get_progress: {str(e)}")
        return jsonify({"error": "An error occurred while fetching progress data"}), 500

@app.route('/export', methods=['GET'])
def export_data():
    timeframe = request.args.get('timeframe', '30')
    timeframe = int(timeframe)
    
    start_date = datetime.utcnow().date() - timedelta(days=timeframe)
    
    tasks = db.session.query(Task, User.name.label('user_name')).join(User).filter(
        func.date(Task.date_created) >= start_date
    ).all()
    
    export_data = [{
        'id': task.Task.id,
        'content': task.Task.content,
        'completed': task.Task.completed,
        'user_id': task.Task.user_id,
        'user_name': task.user_name,
        'date_created': task.Task.date_created.isoformat()
    } for task in tasks]
    
    return jsonify(export_data)
