"""
Environment telemetry models and validation rules.
"""

from pydantic import BaseModel, Field, ConfigDict, model_validator


class EnvironmentInput(BaseModel):
    """
    Environmental parameters either measured or simulated.
    Supports both descriptive engineering field names (depth_m, temperature_c)
    and concise UI field names (depth, temperature).
    """
    model_config = ConfigDict(populate_by_name=True)

    depth_m: float = Field(
        default=15.0,
        ge=0.0,
        le=11000.0,
        alias="depth",
        description="Water depth in meters (0 to 11,000 m)",
    )
    turbidity: float = Field(
        default=20.0,
        ge=0.0,
        le=100.0,
        description="Turbidity measurement (0 to 100 NTU scale or normalized)",
    )
    temperature_c: float = Field(
        default=26.0,
        ge=-5.0,
        le=45.0,
        alias="temperature",
        description="Water temperature in degrees Celsius (-5 to 45 °C)",
    )
    salinity_psu: float = Field(
        default=35.0,
        ge=0.0,
        le=45.0,
        alias="salinity",
        description="Salinity in Practical Salinity Units (0 to 45 PSU)",
    )
    battery_pct: float = Field(
        default=72.0,
        ge=0.0,
        le=100.0,
        alias="battery",
        description="Payload battery state of charge (0 to 100 %)",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data):
        if not isinstance(data, dict):
            return data
        # Handle field alias conversions if provided in camelCase or short forms
        res = dict(data)
        if "depth" in res and "depth_m" not in res:
            res["depth_m"] = res["depth"]
        if "temperature" in res and "temperature_c" not in res:
            res["temperature_c"] = res["temperature"]
        if "salinity" in res and "salinity_psu" not in res:
            res["salinity_psu"] = res["salinity"]
        if "battery" in res and "battery_pct" not in res:
            res["battery_pct"] = res["battery"]
        return res
