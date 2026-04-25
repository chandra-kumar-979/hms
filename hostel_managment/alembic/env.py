from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
from app.database import Base
from app.config import settings
from app.model.user import User
from app.model.hostel import Hostel
from app.model.floor import Floor
from app.model.room import Room
from app.model.bed import Bed
from app.model.booking import Booking
from app.model.payment import Payment
from app.model.feedback import Feedback
from app.model.notification import Notification
from app.model.broadcast import BroadcastMessage

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
