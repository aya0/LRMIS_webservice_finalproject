from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.routing import APIRoute
from starlette.responses import JSONResponse


class Module2ValidationRoute(APIRoute):
    def get_route_handler(self):
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request):
            try:
                return await original_route_handler(request)
            except RequestValidationError as exc:
                return JSONResponse(
                    status_code=400,
                    content={"detail": jsonable_encoder(exc.errors())},
                )
            except HTTPException as exc:
                if exc.status_code == 422:
                    return JSONResponse(status_code=400, content={"detail": exc.detail})
                raise

        return custom_route_handler
