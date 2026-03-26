from __future__ import annotations

import argparse
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.schemas.user_schema import (
    UserCreateRequest,
    UserDashboardAccessRequest,
    UserPasswordResetRequest,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.services.user_service import UserService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage BI Service users")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create", help="Create a new user")
    create.add_argument("--username", required=True)
    create.add_argument("--password", required=True)
    create.add_argument("--role", choices=["admin", "user"], default="user")

    list_cmd = subparsers.add_parser("list", help="List users")
    list_cmd.add_argument("--include-inactive", action="store_true")

    reset_pw = subparsers.add_parser("reset-password", help="Reset password")
    reset_pw.add_argument("--username", required=True)
    reset_pw.add_argument("--password", required=True)

    set_status = subparsers.add_parser("set-status", help="Enable or disable user")
    set_status.add_argument("--username", required=True)
    set_status.add_argument("--active", choices=["true", "false"], required=True)

    set_role = subparsers.add_parser("set-role", help="Update user role")
    set_role.add_argument("--username", required=True)
    set_role.add_argument("--role", choices=["admin", "user"], required=True)

    rename = subparsers.add_parser("rename", help="Rename username")
    rename.add_argument("--username", required=True)
    rename.add_argument("--new-username", required=True)

    grant_dash = subparsers.add_parser("grant-dashboard", help="Grant dashboard access")
    grant_dash.add_argument("--username", required=True)
    grant_dash.add_argument("--dashboard-key", required=True)

    revoke_dash = subparsers.add_parser("revoke-dashboard", help="Revoke dashboard access")
    revoke_dash.add_argument("--username", required=True)
    revoke_dash.add_argument("--dashboard-key", required=True)

    set_dash = subparsers.add_parser("set-dashboards", help="Replace dashboard access list")
    set_dash.add_argument("--username", required=True)
    set_dash.add_argument("--dashboard-keys", required=True)

    return parser


async def run_command(args: argparse.Namespace, session: AsyncSession) -> None:
    repo = UserRepository(db=session)
    service = UserService(db=session)

    if args.command == "list":
        users = await repo.list_all()
        rows = [u for u in users if args.include_inactive or u.is_active]
        if not rows:
            print("No users found.")
            return
        for user in rows:
            status = "active" if user.is_active else "inactive"
            print(f"{user.id}\t{user.username}\t{user.role}\t{status}\tlast_login={user.last_login_at}")
        return

    if args.command == "create":
        try:
            created = await service.create_user(
                UserCreateRequest(username=args.username, password=args.password, role=args.role)
            )
        except ValueError as e:
            print(str(e))
            return
        print(f"Created user: {created.username} ({created.role})")
        return

    user = await repo.get_by_username(args.username)
    if not user:
        print(f"User not found: {args.username}")
        return

    if args.command == "reset-password":
        await service.reset_password(
            user.id,
            UserPasswordResetRequest(password=args.password),
        )
        print(f"Password updated for: {args.username}")
        return

    if args.command == "set-status":
        is_active = args.active == "true"
        await service.set_status(user.id, UserStatusUpdateRequest(is_active=is_active))
        state = "active" if is_active else "inactive"
        print(f"User {args.username} set to {state}")
        return

    if args.command == "set-role":
        await service.update_user(
            user.id,
            UserUpdateRequest(role=args.role),
        )
        print(f"User {args.username} role set to {args.role}")
        return

    if args.command == "rename":
        await service.update_user(
            user.id,
            UserUpdateRequest(username=args.new_username),
        )
        print(f"User renamed to: {args.new_username}")
        return

    if args.command == "grant-dashboard":
        current = await service.list_user_dashboards(user.id)
        if args.dashboard_key in current.dashboard_keys:
            print(f"Already granted: {args.dashboard_key}")
            return
        updated_keys = current.dashboard_keys + [args.dashboard_key]
        try:
            await service.set_user_dashboards(
                user.id,
                UserDashboardAccessRequest(dashboard_keys=updated_keys),
            )
            print(f"Granted dashboard {args.dashboard_key} to {args.username}")
        except ValueError as e:
            print(str(e))
        return

    if args.command == "revoke-dashboard":
        current = await service.list_user_dashboards(user.id)
        if args.dashboard_key not in current.dashboard_keys:
            print(f"Not granted: {args.dashboard_key}")
            return
        updated_keys = [k for k in current.dashboard_keys if k != args.dashboard_key]
        await service.set_user_dashboards(
            user.id,
            UserDashboardAccessRequest(dashboard_keys=updated_keys),
        )
        print(f"Revoked dashboard {args.dashboard_key} from {args.username}")
        return

    if args.command == "set-dashboards":
        keys = [k.strip() for k in args.dashboard_keys.split(",") if k.strip()]
        try:
            await service.set_user_dashboards(
                user.id,
                UserDashboardAccessRequest(dashboard_keys=keys),
            )
            print(f"Updated dashboards for {args.username}: {keys}")
        except ValueError as e:
            print(str(e))
        return


async def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    engine = create_async_engine(settings.effective_database_url, pool_pre_ping=True)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async with session_maker() as session:
        await run_command(args, session)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
